import type { ISmsProvider, SendSmsResult } from "./sms.interface.js";
import axios from "axios";
import { envVars } from "../../config/env.config.js";

export class SslWirelessSmsProvider implements ISmsProvider {
  name = "SSL Wireless SMS";

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    try {
      const apiKey = envVars.SSL_WIRELESS_API_KEY;
      const sid = envVars.SSL_WIRELESS_SID;
      const url = envVars.SSL_WIRELESS_URL || "https://smsplus.sslwireless.com/api/v3/send-sms";

      if (!apiKey || !sid) {
        console.warn("SSL Wireless credentials missing. Falling back to console log.");
        console.log(`[SSL Wireless Mock] To: ${to} -> ${message}`);
        return { success: true, messageId: `ssl-fallback-${Date.now()}` };
      }

      // Format Bangladeshi phone numbers to international 880XXXXXXXXXX
      let formattedPhone = to.replace(/[^0-9]/g, "");
      if (formattedPhone.startsWith("01")) {
        formattedPhone = `88${formattedPhone}`;
      }

      const response = await axios.post(
        url,
        {
          api_token: apiKey,
          sid: sid,
          msisdn: formattedPhone,
          sms: message,
          csms_id: `CSMS_${Date.now()}`,
        },
        { timeout: 8000 },
      );

      if (response.data?.status === "SUCCESS" || response.data?.status_code === 200) {
        return {
          success: true,
          messageId: response.data?.smsinfo?.[0]?.sms_id || `ssl-${Date.now()}`,
        };
      }

      return {
        success: false,
        error: response.data?.error_message || "Failed to send SMS via SSL Wireless",
      };
    } catch (err: any) {
      console.error("SSL Wireless SMS error:", err?.response?.data || err?.message);
      return {
        success: false,
        error: err?.message || "Failed to dispatch SSL Wireless SMS",
      };
    }
  }
}
