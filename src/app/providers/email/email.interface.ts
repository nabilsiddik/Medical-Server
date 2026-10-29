export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  name: string;
  sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult>;
}
