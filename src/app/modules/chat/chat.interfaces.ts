export interface ISendMessageInput {
  conversationId: string;
  senderType: "PATIENT" | "DOCTOR" | "AI";
  senderId?: string | undefined;
  senderName?: string | undefined;
  content: string;
  isAi?: boolean | undefined;
}

export interface IStartConversationInput {
  patientId?: string | undefined;
  patientName: string;
  patientPhone?: string | undefined;
  patientEmail?: string | undefined;
  initialMessage?: string | undefined;
}

export interface IConversationFilter {
  searchTerm?: string | undefined;
  status?: string | undefined;
  onlyUnread?: boolean | undefined;
}

export interface IGoogleSheetSyncInput {
  sheetUrl?: string | undefined;
  sheetId?: string | undefined;
}
