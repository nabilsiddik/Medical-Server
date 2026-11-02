import dotenv from "dotenv";
dotenv.config();

export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  DIRECT_URL?: string | undefined;
  SALT_ROUND: number;
  CLIENT_URL: string;
  REDIS_URL?: string | undefined;

  // Single-Source Branding System
  BRAND_NAME: string;
  BRAND_TAGLINE: string;
  BRAND_PRIMARY_COLOR: string;
  BRAND_SECONDARY_COLOR: string;
  BRAND_LOGO_URL: string;
  BRAND_FAVICON_URL: string;

  // Email Config
  EMAIL_PROVIDER: string;
  EMAIL_SENDER_EMAIL: string;
  EMAIL_SENDER_APP_PASS: string;
  ADMIN_EMAIL: string;
  RESEND_API_KEY?: string | undefined;

  // SMS Config
  SMS_PROVIDER: string;
  SSL_WIRELESS_API_KEY?: string | undefined;
  SSL_WIRELESS_SID?: string | undefined;
  SSL_WIRELESS_URL?: string | undefined;
  BULKSMSBD_API_KEY?: string | undefined;
  TWILIO_ACCOUNT_SID?: string | undefined;
  TWILIO_AUTH_TOKEN?: string | undefined;
  TWILIO_PHONE_NUMBER?: string | undefined;

  // AI & Video Providers
  GEMINI_API_KEY?: string | undefined;
  JITSI_DOMAIN?: string | undefined;
  ZOOM_ACCOUNT_ID?: string | undefined;
  ZOOM_CLIENT_ID?: string | undefined;
  ZOOM_CLIENT_SECRET?: string | undefined;

  // Payment Gateways
  STRIPE_SECRET_KEY?: string | undefined;
  SSLCOMMERZ_STORE_ID?: string | undefined;
  SSLCOMMERZ_STORE_PASSWORD?: string | undefined;
  SSLCOMMERZ_IS_SANDBOX?: boolean | undefined;
  BKASH_APP_KEY?: string | undefined;
  BKASH_APP_SECRET?: string | undefined;
  BKASH_USERNAME?: string | undefined;
  BKASH_PASSWORD?: string | undefined;
  BKASH_IS_SANDBOX?: boolean | undefined;

  JWT: {
    JWT_ACCESS_SECRET: string;
    JWT_ACCESS_SECRET_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_SECRET_EXPIRES_IN: string;
    JWT_RESET_PASS_SECRET: string;
    JWT_RESET_PASS_SECRET_EXPIRES_IN: string;
  };
  CLOUDINARY: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
  DO_SPACE?: {
    DO_SPACE_ENDPOINT: string;
    DO_SPACE_ACCESS_KEY: string;
    DO_SPACE_SECRET_KEY: string;
    DO_SPACE_BUCKET: string;
  } | undefined;
  GOOGLE?: {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
  } | undefined;
  FACEBOOK?: {
    FACEBOOK_APP_ID: string;
    FACEBOOK_APP_SECRET: string;
    FACEBOOK_REDIRECT_URI: string;
  } | undefined;
  GITHUB?: {
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GITHUB_REDIRECT_URI: string;
  } | undefined;
}

const loadEnvVariables = (): EnvConfig => {
  const requiredEnvVars: string[] = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ];

  requiredEnvVars.forEach((key: string) => {
    if (!process.env[key]) {
      throw new Error(`Environment variable "${key}" is required but missing in .env file.`);
    }
  });

  return {
    PORT: Number(process.env.PORT) || 5000,
    DATABASE_URL: process.env.DATABASE_URL as string,
    DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV || "development",
    SALT_ROUND: Number(process.env.SALT_ROUND) || 10,
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
    REDIS_URL: process.env.REDIS_URL || "",

    // Branding defaults
    BRAND_NAME: process.env.BRAND_NAME || "Doctor Practice",
    BRAND_TAGLINE: process.env.BRAND_TAGLINE || "Excellence in Healthcare",
    BRAND_PRIMARY_COLOR: process.env.BRAND_PRIMARY_COLOR || "#0284c7",
    BRAND_SECONDARY_COLOR: process.env.BRAND_SECONDARY_COLOR || "#0f766e",
    BRAND_LOGO_URL: process.env.BRAND_LOGO_URL || "",
    BRAND_FAVICON_URL: process.env.BRAND_FAVICON_URL || "",

    // Email
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "nodemailer",
    EMAIL_SENDER_EMAIL: process.env.EMAIL_SENDER_EMAIL || "",
    EMAIL_SENDER_APP_PASS: process.env.EMAIL_SENDER_APP_PASS || "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "nabilsiddik70@gmail.com",
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",

    // SMS
    SMS_PROVIDER: process.env.SMS_PROVIDER || "mock",
    SSL_WIRELESS_API_KEY: process.env.SSL_WIRELESS_API_KEY || "",
    SSL_WIRELESS_SID: process.env.SSL_WIRELESS_SID || "",
    SSL_WIRELESS_URL: process.env.SSL_WIRELESS_URL || "",
    BULKSMSBD_API_KEY: process.env.BULKSMSBD_API_KEY || "",
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",

    // AI & Video
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    JITSI_DOMAIN: process.env.JITSI_DOMAIN || "meet.jit.si",
    ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID || "",
    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID || "",
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET || "",

    // Payments
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID || "",
    SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    SSLCOMMERZ_IS_SANDBOX: process.env.SSLCOMMERZ_IS_SANDBOX === "true",
    BKASH_APP_KEY: process.env.BKASH_APP_KEY || "",
    BKASH_APP_SECRET: process.env.BKASH_APP_SECRET || "",
    BKASH_USERNAME: process.env.BKASH_USERNAME || "",
    BKASH_PASSWORD: process.env.BKASH_PASSWORD || "",
    BKASH_IS_SANDBOX: process.env.BKASH_IS_SANDBOX !== "false",

    JWT: {
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
      JWT_ACCESS_SECRET_EXPIRES_IN:
        process.env.JWT_ACCESS_SECRET_EXPIRES_IN || "10d",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
      JWT_REFRESH_SECRET_EXPIRES_IN:
        process.env.JWT_REFRESH_SECRET_EXPIRES_IN || "90d",
      JWT_RESET_PASS_SECRET:
        process.env.JWT_RESET_PASS_SECRET ||
        (process.env.JWT_ACCESS_SECRET as string),
      JWT_RESET_PASS_SECRET_EXPIRES_IN:
        process.env.JWT_RESET_PASS_SECRET_EXPIRES_IN || "10m",
    },
    CLOUDINARY: {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    },
    DO_SPACE: {
      DO_SPACE_ENDPOINT: process.env.DO_SPACE_ENDPOINT || "",
      DO_SPACE_ACCESS_KEY: process.env.DO_SPACE_ACCESS_KEY || "",
      DO_SPACE_SECRET_KEY: process.env.DO_SPACE_SECRET_KEY || "",
      DO_SPACE_BUCKET: process.env.DO_SPACE_BUCKET || "",
    },
    GOOGLE: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
    },
    FACEBOOK: {
      FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || "",
      FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || "",
      FACEBOOK_REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI || "",
    },
    GITHUB: {
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
      GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || "",
    },
  };
};

export const envVars = loadEnvVariables();
