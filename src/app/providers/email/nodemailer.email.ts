import type { IEmailProvider, SendEmailResult } from "./email.interface.js";
import nodemailer from "nodemailer";
import { envVars } from "../../config/env.config.js";

export class NodemailerEmailProvider implements IEmailProvider {
  name = "Nodemailer SMTP";

  private transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: envVars.EMAIL_SENDER_EMAIL,
      pass: envVars.EMAIL_SENDER_APP_PASS,
    },
  });

  async sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
    try {
      if (!envVars.EMAIL_SENDER_EMAIL || !envVars.EMAIL_SENDER_APP_PASS) {
        console.warn("Nodemailer credentials missing. Falling back to log.");
        console.log(`[Email Log] To: ${to} | Subject: ${subject}`);
        return { success: true, messageId: `mock-mail-${Date.now()}` };
      }

      const info = await this.transporter.sendMail({
        from: `"${envVars.BRAND_NAME}" <${envVars.EMAIL_SENDER_EMAIL}>`,
        to,
        subject,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("Nodemailer send error:", err?.message);
      return {
        success: false,
        error: err?.message || "Failed to dispatch email",
      };
    }
  }
}

export class MockEmailProvider implements IEmailProvider {
  name = "Mock Email Provider";

  async sendEmail(to: string, subject: string, _html: string): Promise<SendEmailResult> {
    console.log(`\n📧 [MOCK EMAIL DISPATCH] To: ${to}`);
    console.log(`📌 Subject: ${subject}`);
    console.log(`-----------------------------------------\n`);
    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
    };
  }
}

let emailProviderInstance: IEmailProvider | null = null;

export const getEmailProvider = (): IEmailProvider => {
  if (emailProviderInstance) {
    return emailProviderInstance;
  }

  const selected = (envVars.EMAIL_PROVIDER || "nodemailer").toLowerCase();

  switch (selected) {
    case "mock":
      emailProviderInstance = new MockEmailProvider();
      break;
    case "nodemailer":
    default:
      emailProviderInstance = new NodemailerEmailProvider();
      break;
  }

  return emailProviderInstance;
};
