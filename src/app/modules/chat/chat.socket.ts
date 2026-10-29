import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { ChatServices } from "./chat.services.js";
import { generateAiChatResponse } from "./aiAssistant.services.js";
import { prisma } from "../../../lib/prisma.js";

let io: SocketIOServer | null = null;

export const initChatSocket = (httpServer: HTTPServer, allowedOrigins: string[]) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  console.log("⚡ Socket.io real-time chat server initialized.");

  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Client connected to chat: ${socket.id}`);

    // Join conversation room
    socket.on("join_conversation", (conversationId: string) => {
      if (!conversationId) return;
      const room = `conversation_${conversationId}`;
      socket.join(room);
      console.log(`👤 Socket ${socket.id} joined room ${room}`);
    });

    // Leave conversation room
    socket.on("leave_conversation", (conversationId: string) => {
      if (!conversationId) return;
      const room = `conversation_${conversationId}`;
      socket.leave(room);
      console.log(`👋 Socket ${socket.id} left room ${room}`);
    });

    // Handle typing indicator
    socket.on(
      "typing",
      (data: { conversationId: string; senderName: string; isTyping: boolean }) => {
        if (!data?.conversationId) return;
        socket.to(`conversation_${data.conversationId}`).emit("user_typing", {
          conversationId: data.conversationId,
          senderName: data.senderName,
          isTyping: data.isTyping,
        });
      },
    );

    // Handle mark as read
    socket.on(
      "mark_read",
      async (data: { conversationId: string; readerRole: "ADMIN" | "PATIENT" }) => {
        if (!data?.conversationId) return;
        try {
          await ChatServices.markAsRead(data.conversationId, data.readerRole || "PATIENT");
          io?.to(`conversation_${data.conversationId}`).emit("messages_read", {
            conversationId: data.conversationId,
            readerRole: data.readerRole,
          });
        } catch (err) {
          console.error("Error marking messages as read via socket:", err);
        }
      },
    );

    // Send Message
    socket.on(
      "send_message",
      async (data: {
        conversationId: string;
        senderType: "PATIENT" | "DOCTOR";
        senderId?: string;
        senderName?: string;
        content: string;
      }) => {
        if (!data?.conversationId || !data?.content) return;

        try {
          const room = `conversation_${data.conversationId}`;

          // 1. Save user/patient/doctor message
          const conversation = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
          });

          if (!conversation) {
            socket.emit("chat_error", { message: "Conversation not found" });
            return;
          }

          const isFromPatient = data.senderType === "PATIENT";
          const senderName = data.senderName || (isFromPatient ? conversation.patientName : "Doctor");

          const userMessage = await prisma.chatMessage.create({
            data: {
              conversationId: data.conversationId,
              senderType: data.senderType,
              senderId: data.senderId || null,
              senderName,
              content: data.content,
              isAi: false,
              isRead: false,
            },
          });

          // Update conversation last message & unread count
          const updatedConv = await prisma.conversation.update({
            where: { id: data.conversationId },
            data: {
              lastMessageText: data.content,
              lastMessageAt: new Date(),
              unreadCountDoctor: isFromPatient
                ? { increment: 1 }
                : conversation.unreadCountDoctor,
              unreadCountPatient: !isFromPatient
                ? { increment: 1 }
                : conversation.unreadCountPatient,
            },
          });

          // Broadcast user message to room
          io?.to(room).emit("new_message", {
            message: userMessage,
            conversation: updatedConv,
          });

          // Broadcast sound trigger notification to recipient
          socket.to(room).emit("notification_sound", {
            conversationId: data.conversationId,
            senderType: data.senderType,
          });

          // 2. If message is from Patient and conversation has AI enabled:
          if (isFromPatient && conversation.aiEnabled) {
            // Emit typing indicator: AI is composing reply
            io?.to(room).emit("user_typing", {
              conversationId: data.conversationId,
              senderName: "AI Medical Assistant",
              isTyping: true,
            });

            // Generate AI answer using Google Sheet knowledge base & doctor context
            const aiReply = await generateAiChatResponse(data.content, conversation.patientName);

            const aiMessage = await prisma.chatMessage.create({
              data: {
                conversationId: data.conversationId,
                senderType: "AI",
                senderName: "AI Medical Assistant",
                content: aiReply,
                isAi: true,
                isRead: false,
              },
            });

            const finalConv = await prisma.conversation.update({
              where: { id: data.conversationId },
              data: {
                lastMessageText: aiReply,
                lastMessageAt: new Date(),
                unreadCountPatient: { increment: 1 },
              },
            });

            // Stop typing indicator
            io?.to(room).emit("user_typing", {
              conversationId: data.conversationId,
              senderName: "AI Medical Assistant",
              isTyping: false,
            });

            // Broadcast AI message
            io?.to(room).emit("new_message", {
              message: aiMessage,
              conversation: finalConv,
            });

            // Trigger sound notification for patient
            io?.to(room).emit("notification_sound", {
              conversationId: data.conversationId,
              senderType: "AI",
            });
          }
        } catch (error) {
          console.error("Socket send_message error:", error);
          socket.emit("chat_error", { message: "Failed to send message" });
        }
      },
    );

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected from chat: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

