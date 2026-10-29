import nodemailer from "nodemailer";
import { envVars } from "../config/env.config.js";
import AppError from "../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";

const emailSender = async (to: string, html: string, subject: string) => {
  if (!envVars.EMAIL_SENDER_EMAIL || !envVars.EMAIL_SENDER_APP_PASS) {
    console.warn("⚠️ Email sender credentials not configured in environment variables.");
    if (envVars.NODE_ENV === "development") {
      console.log(`[DEV MODE] Email to ${to} with subject "${subject}" was skipped.`);
      return "dev-mock-id";
    }
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Email service is not configured on this server.",
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: envVars.EMAIL_SENDER_EMAIL,
        pass: envVars.EMAIL_SENDER_APP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"Support" <${envVars.EMAIL_SENDER_EMAIL}>`,
      to,
      html,
      subject,
    };

    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to send email. Please try again later.",
    );
  }
};

emailSender.sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  return emailSender(to, html, subject);
};

export default emailSender;

