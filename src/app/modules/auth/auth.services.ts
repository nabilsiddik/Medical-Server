import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcryptjs";
import AppError from "../../errorHelpers/appError.js";
import { generateJwtToken, verifyToken } from "../../utils/jwtToken.js";
import { envVars } from "../../config/env.config.js";
import { StatusCodes } from "http-status-codes";
import { generateOTP } from "../../utils/otp.js";
import {
  forgetPasswordEmail,
  generateOtpEmail,
  resendOtpEmail,
} from "../../utils/emailHTML.js";
import emailSender from "../../utils/emailSender.js";
import type { SignOptions } from "jsonwebtoken";
import {
  UserRole,
  UserStatus,
  type OTPType,
  type AuthProvider,
} from "../../../generated/prisma/enums.js";
import type {
  IResetPasswordInput,
  ISocialLoginInput,
  IUserLoginInput,
  IVerifyOTPInput,
} from "./auth.interfaces.js";
import type { JWTPayload } from "../../interfaces/index.js";
import { isDemoUser } from "../../utils/demoHelper.js";

// User login
const loginUser = async (payload: IUserLoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    include: {
      authAccounts: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `No user found with email ${payload.email}`,
    );
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Your account is blocked. Please contact support.",
    );
  }

  const account = user.authAccounts.find(
    (acc) => acc.provider === "CREDENTIAL",
  );

  if (!account || !account.password) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Your account is not password-based. Please login using your social provider.",
    );
  }

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    account.password,
  );

  if (!isCorrectPassword) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid password");
  }

  if (!user.isEmailVerified) {
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await prisma.oTP.create({
      data: {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        codeHash: hashedOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const html = generateOtpEmail(otp);
    await emailSender(user.email, html, "Email Verification OTP");

    throw new AppError(
      StatusCodes.FORBIDDEN,
      `Email is not verified. A verification OTP has been sent to ${user.email}.`,
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      status: UserStatus.ACTIVE,
    },
  });

  const isDemo = isDemoUser(user.email);

  const jwtPayload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isDemo,
  };

  const accessToken = generateJwtToken(
    jwtPayload,
    envVars.JWT.JWT_ACCESS_SECRET,
    envVars.JWT.JWT_ACCESS_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
  );

  const refreshToken = generateJwtToken(
    jwtPayload,
    envVars.JWT.JWT_REFRESH_SECRET,
    envVars.JWT.JWT_REFRESH_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
  );

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      profilePhoto: user.profilePhoto,
      isDemo,
    },
    accessToken,
    refreshToken,
  };
};

// Refresh Token Handler
const refreshToken = async (token: string) => {
  if (!token) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Refresh token is required",
    );
  }

  let decoded: JWTPayload;
  try {
    decoded = verifyToken(token, envVars.JWT.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Invalid or expired refresh token",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user || user.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found or deleted");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Your account is blocked. Please contact support.",
    );
  }

  const isDemo = isDemoUser(user.email);

  const jwtPayload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isDemo,
  };

  const newAccessToken = generateJwtToken(
    jwtPayload,
    envVars.JWT.JWT_ACCESS_SECRET,
    envVars.JWT.JWT_ACCESS_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
  );

  const newRefreshToken = generateJwtToken(
    jwtPayload,
    envVars.JWT.JWT_REFRESH_SECRET,
    envVars.JWT.JWT_REFRESH_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

// Change Password
const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { authAccounts: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  const account = user.authAccounts.find(
    (acc) => acc.provider === "CREDENTIAL",
  );

  if (!account || !account.password) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "No password-based credential account found for this user.",
    );
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, account.password);

  if (!isPasswordValid) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Incorrect old password");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(envVars.SALT_ROUND),
  );

  await prisma.authAccount.update({
    where: { id: account.id },
    data: { password: hashedPassword },
  });

  return { message: "Password changed successfully" };
};

// Resend OTP
const resendOtp = async (email: string, otpType: OTPType) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, "User with this email not found");
  }

  // Rate limit: Check if OTP was sent in the last 60 seconds
  const recentOtp = await prisma.oTP.findFirst({
    where: {
      userId: user.id,
      type: otpType,
      createdAt: {
        gte: new Date(Date.now() - 60 * 1000),
      },
    },
  });

  if (recentOtp) {
    throw new AppError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Please wait at least 60 seconds before requesting another OTP",
    );
  }

  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Delete previous OTPs of this type for the user
  await prisma.oTP.deleteMany({
    where: {
      userId: user.id,
      type: otpType,
    },
  });

  // Create new OTP record
  await prisma.oTP.create({
    data: {
      userId: user.id,
      type: otpType,
      codeHash: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const html = resendOtpEmail(otp);
  await emailSender(user.email, html, "Verification OTP Resend");

  return { message: "OTP resent successfully. Please check your email." };
};

// Verify OTP
const verifyOtp = async (payload: IVerifyOTPInput) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { authAccounts: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, "Invalid OTP or user not found");
  }

  // Find latest unexpired OTP
  const otpRecord = await prisma.oTP.findFirst({
    where: {
      userId: user.id,
      type: payload.type,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new AppError(StatusCodes.BAD_REQUEST, "No OTP found or expired");
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "OTP has expired");
  }

  const isMatch = await bcrypt.compare(payload.otp, otpRecord.codeHash);

  if (!isMatch) {
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid OTP code");
  }

  // Delete OTP after successful verification
  await prisma.oTP.deleteMany({
    where: {
      userId: user.id,
      type: payload.type,
    },
  });

  // Handle email verification flow
  if (payload.type === "EMAIL_VERIFICATION") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    const jwtPayload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateJwtToken(
      jwtPayload,
      envVars.JWT.JWT_ACCESS_SECRET,
      envVars.JWT.JWT_ACCESS_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
    );

    const refreshToken = generateJwtToken(
      jwtPayload,
      envVars.JWT.JWT_REFRESH_SECRET,
      envVars.JWT.JWT_REFRESH_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
    );

    return {
      type: "LOGIN_SUCCESS",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Handle forgot password flow
  if (payload.type === "FORGOT_PASSWORD") {
    const jwtPayload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const resetToken = generateJwtToken(
      jwtPayload,
      envVars.JWT.JWT_RESET_PASS_SECRET,
      envVars.JWT.JWT_RESET_PASS_SECRET_EXPIRES_IN as SignOptions["expiresIn"],
    );

    const account = user.authAccounts.find(
      (acc) => acc.provider === "CREDENTIAL",
    );

    if (account) {
      await prisma.authAccount.update({
        where: { id: account.id },
        data: { passwordResetToken: resetToken },
      });
    }

    return {
      type: "RESET_PASSWORD",
      resetToken,
    };
  }
};

// Forgot Password Request
const forgotPassword = async (payload: { email: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user || user.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, "User with this email not found");
  }

  const otp = generateOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  await prisma.oTP.deleteMany({
    where: {
      userId: user.id,
      type: "FORGOT_PASSWORD",
    },
  });

  await prisma.oTP.create({
    data: {
      userId: user.id,
      type: "FORGOT_PASSWORD",
      codeHash: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const html = forgetPasswordEmail(otp);
  await emailSender(user.email, html, "Forgot Password OTP");

  return { message: "Password reset OTP sent to your email successfully" };
};

// Reset Password
const resetPassword = async (payload: IResetPasswordInput) => {
  let decodedToken: JWTPayload;
  try {
    decodedToken = verifyToken(
      payload.resetToken,
      envVars.JWT.JWT_RESET_PASS_SECRET,
    );
  } catch {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Invalid or expired reset token",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: decodedToken.id },
    include: { authAccounts: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  const account = user.authAccounts.find(
    (acc) => acc.provider === "CREDENTIAL",
  );

  if (!account) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "No password account found for this user",
    );
  }

  if (!account.passwordResetToken || account.passwordResetToken !== payload.resetToken) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Password reset token has already been used or is invalid.",
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(envVars.SALT_ROUND),
  );

  await prisma.authAccount.update({
    where: { id: account.id },
    data: { password: hashedPassword, passwordResetToken: null },
  });

  return { message: "Password reset successfully" };
};

// Social Login Handler
const socialLoginHandler = async (payload: ISocialLoginInput) => {
  if (!payload.email) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Email address is required from social provider.",
    );
  }

  let user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { authAccounts: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.name || payload.email.split("@")[0] || "User",
        isEmailVerified: true,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        authAccounts: {
          create: {
            provider: payload.provider,
            providerAccountId: payload.providerId,
            needPasswordChange: true,
          },
        },
      },
      include: { authAccounts: true },
    });

    return user;
  }

  const existingAuthAccount = user.authAccounts.find(
    (acc) => acc.provider === payload.provider,
  );

  if (!existingAuthAccount) {
    await prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: payload.provider,
        providerAccountId: payload.providerId,
      },
    });
  }

  return user;
};

export const AuthServices = {
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
  socialLoginHandler,
};

