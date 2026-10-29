export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  name: string;
  sendSms(to: string, message: string): Promise<SendSmsResult>;
}
