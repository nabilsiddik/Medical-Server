import { z } from "zod";
import { OTPType } from "../../../generated/prisma/enums.js";

const userLoginZodSchema = z.object({
  email: z.string({ message: "Email is required" }).email("Invalid email format"),
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required"),
});

const verifyOTPSchema = z.object({
  email: z.string({ message: "Email is required" }).email("Invalid email format"),
  otp: z.string({ message: "OTP is required" }).min(4, "OTP is required"),
  type: z.nativeEnum(OTPType, { message: "OTP type is required" }),
});

const resendOTPSchema = z.object({
  email: z.string({ message: "Email is required" }).email("Invalid email format"),
  type: z.nativeEnum(OTPType, { message: "OTP type is required" }),
});

const forgotPasswordSchema = z.object({
  email: z.string({ message: "Email is required" }).email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  newPassword: z
    .string({ message: "New password is required" })
    .min(6, "New password must be at least 6 characters"),
  resetToken: z
    .string({ message: "Reset token is required" })
    .min(1, "Reset token is required"),
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string({ message: "Old password is required" })
    .min(1, "Old password is required"),
  newPassword: z
    .string({ message: "New password is required" })
    .min(6, "New password must be at least 6 characters"),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const AuthValidations = {
  userLoginZodSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
};


