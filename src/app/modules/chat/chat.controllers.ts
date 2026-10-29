import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { ChatServices } from "./chat.services.js";
import { GoogleSheetService } from "./googleSheet.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";
import { pickQueries } from "../../utils/pickQueries.js";
import AppError from "../../errorHelpers/appError.js";

// Patient starts or gets active conversation
const startOrGetConversation = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const body = req.body;

  if (currentUserId && !body.patientId) {
    // If authenticated, get linked patient ID
    const user = req.user as any;
    body.patientId = user.patient?.id || body.patientId;
    body.patientName = body.patientName || user.fullName;
    body.patientEmail = body.patientEmail || user.email;
  }

  const result = await ChatServices.getOrCreateConversation(body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversation retrieved successfully",
    data: result,
  });
});

// Send message via REST API
const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const conversationId = String(req.params.id);
  const senderType = (req.body.senderType || (req.user?.role === "ADMIN" ? "DOCTOR" : "PATIENT")) as
    | "PATIENT"
    | "DOCTOR"
    | "AI";

  const result = await ChatServices.sendMessage({
    conversationId,
    senderType,
    senderId: req.user?.id ? String(req.user.id) : undefined,
    senderName: req.body.senderName ? String(req.body.senderName) : undefined,
    content: String(req.body.content || ""),
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

// Doctor Inbox: Get all conversations
const getAllConversations = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pickQueries(req.query, ["searchTerm", "status"]);
  const options = pickQueries(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const filters = {
    searchTerm: rawFilters.searchTerm as string | undefined,
    status: rawFilters.status as string | undefined,
    onlyUnread: req.query.onlyUnread === "true",
  };

  const result = await ChatServices.getAllConversations(filters, options);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversations retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get conversation messages by ID
const getConversationById = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.getConversationById(String(req.params.id));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversation details retrieved successfully",
    data: result,
  });
});

// Mark conversation as read
const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const readerRole = req.user?.role === "ADMIN" ? "ADMIN" : "PATIENT";
  const result = await ChatServices.markAsRead(String(req.params.id), readerRole);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Conversation marked as read",
    data: result,
  });
});

// Doctor toggles AI response for a conversation
const toggleAi = catchAsync(async (req: Request, res: Response) => {
  const { aiEnabled } = req.body;
  if (aiEnabled === undefined) {
    throw new AppError(StatusCodes.BAD_REQUEST, "aiEnabled (boolean) is required.");
  }

  const result = await ChatServices.toggleAi(String(req.params.id), Boolean(aiEnabled));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `AI auto-reply ${aiEnabled ? "enabled" : "disabled"} for this conversation`,
    data: result,
  });
});

// Admin syncs Google Sheet
const syncGoogleSheet = catchAsync(async (req: Request, res: Response) => {
  const result = await GoogleSheetService.syncGoogleSheet(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

// Admin gets Google Sheet connection status
const getGoogleSheetStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await GoogleSheetService.getGoogleSheetStatus();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Google Sheet connection status retrieved successfully",
    data: result,
  });
});

export const ChatControllers = {
  startOrGetConversation,
  sendMessage,
  getAllConversations,
  getConversationById,
  markAsRead,
  toggleAi,
  syncGoogleSheet,
  getGoogleSheetStatus,
};
