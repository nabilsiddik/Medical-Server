import type { ISmsProvider } from "./sms.interface.js";
import { MockSmsProvider } from "./mock.sms.js";
import { SslWirelessSmsProvider } from "./sslwireless.sms.js";
import { TwilioSmsProvider } from "./twilio.sms.js";
import { envVars } from "../../config/env.config.js";

let smsProviderInstance: ISmsProvider | null = null;

export const getSmsProvider = (): ISmsProvider => {
  if (smsProviderInstance) {
    return smsProviderInstance;
  }

  const selectedProvider = (envVars.SMS_PROVIDER || "mock").toLowerCase();

  switch (selectedProvider) {
    case "sslwireless":
    case "ssl_wireless":
      smsProviderInstance = new SslWirelessSmsProvider();
      break;
    case "twilio":
      smsProviderInstance = new TwilioSmsProvider();
      break;
    case "mock":
    default:
      smsProviderInstance = new MockSmsProvider();
      break;
  }

  return smsProviderInstance;
};
