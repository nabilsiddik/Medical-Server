import type { AuthProvider, OTPType } from "../../../generated/prisma/enums.js";

export interface IUserLoginInput {
  email: string;
  password: string;
}

export interface IVerifyOTPInput {
  email: string;
  otp: string;
  type: OTPType;
}

export interface IResetPasswordInput {
  newPassword: string;
  resetToken: string;
}

export interface ISocialLoginInput {
  email?: string;
  provider: AuthProvider;
  providerId: string;
  name?: string;
}