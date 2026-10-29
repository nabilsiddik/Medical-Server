import { prisma } from "../../../lib/prisma.js";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import calculatePagination, { type IOptions } from "../../utils/paginations.js";
import { generateAiChatResponse } from "./aiAssistant.services.js";
import type {
  ISendMessageInput,
  IStartConversationInput,
  IConversationFilter,
} from "./chat.interfaces.js";

// 1. Get or Create Conversation (for Patient or Guest)
const getOrCreateConversation = async (data: IStartConversationInput) => {
  const patientPhone = data.patientPhone?.trim();
  const patientName = data.patientName?.trim() || "Guest Patient";

  let conversation = null;

  // Search by patient ID if provided
  if (data.patientId) {
    conversation = await prisma.conversation.findFirst({
      where: { patientId: data.patientId, status: "ACTIVE" },
      include: {
        messages: {
          take: 50,
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  // Search by phone number
  if (!conversation && patientPhone) {
    conversation = await prisma.conversation.findFirst({
      where: { patientPhone, status: "ACTIVE" },
      include: {
        messages: {
          take: 50,
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  // If not found, create new conversation
  if (!conversation) {
    const createPayload: any = {
      patientId: data.patientId || null,
      patientName,
      patientPhone: patientPhone || null,
      patientEmail: data.patientEmail || null,
      lastMessageText: data.initialMessage || "Conversation started",
      lastMessageAt: new Date(),
      aiEnabled: true,
      status: "ACTIVE",
    };

    if (data.initialMessage) {
      createPayload.messages = {
        create: [
          {
            senderType: "PATIENT",
            senderName: patientName,
            content: data.initialMessage,
            isAi: false,
            isRead: false,
          },
        ],
      };
    }

    conversation = await prisma.conversation.create({
      data: createPayload,
      include: {
        messages: true,
      },
    });

    // If initial message provided, generate AI reply automatically
    if (data.initialMessage) {
      const aiReply = await generateAiChatResponse(data.initialMessage, patientName);
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "AI",
          senderName: "AI Medical Assistant",
          content: aiReply,
          isAi: true,
          isRead: false,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageText: aiReply,
          lastMessageAt: new Date(),
          unreadCountPatient: 1,
        },
      });

      // Reload with new message
      conversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }
  }

  return conversation;
};

// 2. Send Message (by Patient or Doctor)
const sendMessage = async (data: ISendMessageInput) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: data.conversationId },
  });

  if (!conversation) {
    throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  // 1. Save sender's message
  const userMessage = await prisma.chatMessage.create({
    data: {
      conversationId: data.conversationId,
      senderType: data.senderType,
      senderId: data.senderId || null,
      senderName: data.senderName || (data.senderType === "DOCTOR" ? "Doctor" : conversation.patientName),
      content: data.content,
      isAi: Boolean(data.isAi),
      isRead: false,
    },
  });

  // Update conversation
  const isFromPatient = data.senderType === "PATIENT";
  await prisma.conversation.update({
    where: { id: data.conversationId },
    data: {
      lastMessageText: data.content,
      lastMessageAt: new Date(),
      unreadCountDoctor: isFromPatient ? { increment: 1 } : conversation.unreadCountDoctor,
      unreadCountPatient: !isFromPatient ? { increment: 1 } : conversation.unreadCountPatient,
    },
  });

  let aiMessage = null;

  // 2. If message is from Patient and AI is enabled, generate AI response
  if (isFromPatient && conversation.aiEnabled) {
    const aiContent = await generateAiChatResponse(data.content, conversation.patientName);
    aiMessage = await prisma.chatMessage.create({
      data: {
        conversationId: data.conversationId,
        senderType: "AI",
        senderName: "AI Medical Assistant",
        content: aiContent,
        isAi: true,
        isRead: false,
      },
    });

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessageText: aiContent,
        lastMessageAt: new Date(),
        unreadCountPatient: { increment: 1 },
      },
    });
  }

  return {
    userMessage,
    aiMessage,
  };
};

// 3. Get All Conversations (Doctor Dashboard Inbox with Search by patient name, phone, or id)
const getAllConversations = async (filters: IConversationFilter, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, status, onlyUnread } = filters;

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { patientName: { contains: searchTerm, mode: "insensitive" } },
        { patientPhone: { contains: searchTerm, mode: "insensitive" } },
        { patientEmail: { contains: searchTerm, mode: "insensitive" } },
        { id: { contains: searchTerm, mode: "insensitive" } },
        { patientId: { contains: searchTerm, mode: "insensitive" } },
        { lastMessageText: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (status && status !== "ALL") {
    andConditions.push({ status });
  }

  if (onlyUnread) {
    andConditions.push({ unreadCountDoctor: { gt: 0 } });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, data, unreadTotal] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { lastMessageAt: "desc" },
      include: {
        patient: {
          select: {
            id: true,
            patientId: true,
            fullName: true,
            phone: true,
            gender: true,
          },
        },
      },
    }),
    prisma.conversation.count({
      where: { unreadCountDoctor: { gt: 0 } },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit) || 1,
      unreadTotal,
    },
    data,
  };
};

// 4. Get Conversation by ID with messages
const getConversationById = async (id: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      patient: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  return conversation;
};

// 5. Mark Conversation as Read
const markAsRead = async (conversationId: string, readerRole: "ADMIN" | "PATIENT") => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  if (readerRole === "ADMIN") {
    // Mark messages from patient as read
    await prisma.chatMessage.updateMany({
      where: { conversationId, senderType: "PATIENT", isRead: false },
      data: { isRead: true },
    });
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCountDoctor: 0 },
    });
  } else {
    // Mark messages from doctor or AI as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderType: { in: ["DOCTOR", "AI"] },
        isRead: false,
      },
      data: { isRead: true },
    });
    return await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCountPatient: 0 },
    });
  }
};

// 6. Toggle AI for a conversation
const toggleAi = async (conversationId: string, aiEnabled: boolean) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  return await prisma.conversation.update({
    where: { id: conversationId },
    data: { aiEnabled },
  });
};

export const ChatServices = {
  getOrCreateConversation,
  sendMessage,
  getAllConversations,
  getConversationById,
  markAsRead,
  toggleAi,
};
