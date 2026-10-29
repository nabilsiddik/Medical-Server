import type { ISmsProvider, SendSmsResult } from "./sms.interface.js";

export class MockSmsProvider implements ISmsProvider {
  name = "Mock SMS Provider";

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    console.log(`\n📱 [MOCK SMS DISPATCH] To: ${to}`);
    console.log(`💬 Message: ${message}`);
    console.log(`-----------------------------------------\n`);
    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}
