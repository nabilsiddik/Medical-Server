import { Router } from "express";
import { ChatControllers } from "./chat.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const chatRouter = Router();

// 1. Patient / Guest Live Chat Widget
chatRouter.post("/conversations", ChatControllers.startOrGetConversation);
chatRouter.post("/conversations/:id/messages", ChatControllers.sendMessage);
chatRouter.get("/conversations/:id", ChatControllers.getConversationById);
chatRouter.patch("/conversations/:id/read", ChatControllers.markAsRead);

// 2. Doctor Dashboard Messenger Inbox (Doctor Admin)
chatRouter.get(
  "/inbox",
  checkAuth(UserRole.ADMIN),
  ChatControllers.getAllConversations,
);
chatRouter.get(
  "/conversations",
  checkAuth(UserRole.ADMIN),
  ChatControllers.getAllConversations,
);

// Doctor toggles AI for conversation
chatRouter.patch(
  "/conversations/:id/ai-toggle",
  checkAuth(UserRole.ADMIN),
  ChatControllers.toggleAi,
);

// 3. Google Sheet Knowledge Base Connection (Doctor Admin)
chatRouter.post(
  "/google-sheet/sync",
  checkAuth(UserRole.ADMIN),
  ChatControllers.syncGoogleSheet,
);
chatRouter.get(
  "/google-sheet/status",
  checkAuth(UserRole.ADMIN),
  ChatControllers.getGoogleSheetStatus,
);

export default chatRouter;

