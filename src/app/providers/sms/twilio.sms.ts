import type { ISmsProvider, SendSmsResult } from "./sms.interface.js";
import axios from "axios";
import { envVars } from "../../config/env.config.js";

export class TwilioSmsProvider implements ISmsProvider {
  name = "Twilio SMS";

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    try {
      const accountSid = envVars.TWILIO_ACCOUNT_SID;
      const authToken = envVars.TWILIO_AUTH_TOKEN;
      const fromNumber = envVars.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.warn("Twilio credentials missing. Logging to console.");
        console.log(`[Twilio Mock] To: ${to} -> ${message}`);
        return { success: true, messageId: `twilio-mock-${Date.now()}` };
      }

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const params = new URLSearchParams();
      params.append("To", to);
      params.append("From", fromNumber);
      params.append("Body", message);

      const response = await axios.post(url, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 8000,
      });

      return {
        success: true,
        messageId: response.data?.sid,
      };
    } catch (err: any) {
      console.error("Twilio SMS error:", err?.response?.data || err?.message);
      return {
        success: false,
        error: err?.message || "Failed to dispatch Twilio SMS",
      };
    }
  }
}
