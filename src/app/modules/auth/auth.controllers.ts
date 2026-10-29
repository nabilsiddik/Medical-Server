import type { Request, Response } from "express";
import { AuthServices } from "./auth.services.js";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { sendResponse } from "../../utils/userResponse.js";
import AppError from "../../errorHelpers/appError.js";
import { generateJwtToken } from "../../utils/jwtToken.js";
import { envVars } from "../../config/env.config.js";
import type { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import type { OTPType } from "../../../generated/prisma/enums.js";
import type { JWTPayload } from "../../interfaces/index.js";

const cookieOptions = {
  secure: envVars.NODE_ENV === "production",
  httpOnly: true,
  sameSite: envVars.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
};

// User login
const userLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.loginUser(req.body);
  const { accessToken, refreshToken } = result;

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

// Refresh Token
const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Refresh token not found in cookies or request body",
    );
  }

  const result = await AuthServices.refreshToken(token);

  res.cookie("accessToken", result.accessToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Access token refreshed successfully",
    data: result,
  });
});

// Logout
const logout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User logged out successfully",
    data: null,
  });
});

// Change password
const changePassword = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const { oldPassword, newPassword } = req.body;
  const result = await AuthServices.changePassword(
    req.user.id,
    oldPassword,
    newPassword,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

// Forgot password
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset OTP sent to email",
    data: result,
  });
});

// Resend OTP
const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, type } = req.body;
  const result = await AuthServices.resendOtp(email, type as OTPType);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP resent successfully",
    data: result,
  });
});

// Verify OTP
const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, type } = req.body;
  const result = await AuthServices.verifyOtp({ email, otp, type });

  if (!result) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "OTP verification failed",
    );
  }

  if (result.type === "LOGIN_SUCCESS") {
    res.cookie("accessToken", result.accessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24,
    });
    res.cookie("refreshToken", result.refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message:
      result.type === "RESET_PASSWORD"
        ? "OTP verified. You can now reset your password."
        : "OTP verified successfully",
    data: result,
  });
});

// Reset password
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { newPassword, resetToken } = req.body;
  const result = await AuthServices.resetPassword({
    newPassword,
    resetToken,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset successful",
    data: result,
  });
});

// --------- Social Login ----------- //
const googleLoginRedirect = catchAsync(async (req: Request, res: Response) => {
  if (!envVars.GOOGLE?.GOOGLE_CLIENT_ID || !envVars.GOOGLE?.GOOGLE_REDIRECT_URI) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Google OAuth is not configured on this server.",
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: envVars.GOOGLE.GOOGLE_CLIENT_ID,
      redirect_uri: envVars.GOOGLE.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: ["openid", "email", "profile"].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

  res.redirect(url);
});

// Google callback
const googleCallback = catchAsync(async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Authorization code missing");
  }

  if (!envVars.GOOGLE?.GOOGLE_CLIENT_ID || !envVars.GOOGLE?.GOOGLE_CLIENT_SECRET) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Google OAuth credentials missing",
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: envVars.GOOGLE.GOOGLE_CLIENT_ID,
      client_secret: envVars.GOOGLE.GOOGLE_CLIENT_SECRET,
      redirect_uri: envVars.GOOGLE.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Failed to retrieve Google token");
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = await userRes.json();

  const user = await AuthServices.socialLoginHandler({
    email: profile.email,
    provider: "GOOGLE",
    providerId: profile.id,
    name: profile.name,
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

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Google login successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Facebook login redirect
const facebookLoginRedirect = catchAsync(async (req: Request, res: Response) => {
  if (!envVars.FACEBOOK?.FACEBOOK_APP_ID || !envVars.FACEBOOK?.FACEBOOK_REDIRECT_URI) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Facebook OAuth is not configured on this server.",
    );
  }

  const url =
    "https://www.facebook.com/v19.0/dialog/oauth?" +
    new URLSearchParams({
      client_id: envVars.FACEBOOK.FACEBOOK_APP_ID,
      redirect_uri: envVars.FACEBOOK.FACEBOOK_REDIRECT_URI,
      scope: "email,public_profile",
      response_type: "code",
    });

  res.redirect(url);
});

// Facebook callback
const facebookCallback = catchAsync(async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Authorization code missing");
  }

  if (!envVars.FACEBOOK?.FACEBOOK_APP_ID || !envVars.FACEBOOK?.FACEBOOK_APP_SECRET) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Facebook OAuth credentials missing",
    );
  }

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: envVars.FACEBOOK.FACEBOOK_APP_ID,
        client_secret: envVars.FACEBOOK.FACEBOOK_APP_SECRET,
        redirect_uri: envVars.FACEBOOK.FACEBOOK_REDIRECT_URI,
        code,
      }),
  );

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Failed to retrieve Facebook token");
  }

  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`,
  );

  const profile = await profileRes.json();

  const user = await AuthServices.socialLoginHandler({
    email: profile.email,
    provider: "FACEBOOK",
    providerId: profile.id,
    name: profile.name,
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

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Facebook login successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

// GitHub Redirect
const githubLoginRedirect = catchAsync(async (req: Request, res: Response) => {
  if (!envVars.GITHUB?.GITHUB_CLIENT_ID || !envVars.GITHUB?.GITHUB_REDIRECT_URI) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "GitHub OAuth is not configured on this server.",
    );
  }

  const url =
    "https://github.com/login/oauth/authorize?" +
    new URLSearchParams({
      client_id: envVars.GITHUB.GITHUB_CLIENT_ID,
      redirect_uri: envVars.GITHUB.GITHUB_REDIRECT_URI,
      scope: "read:user user:email",
    });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Github Login URL fetched successfully.",
    data: url,
  });
});

// Github callback
const githubCallback = catchAsync(async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Authorization code missing");
  }

  if (!envVars.GITHUB?.GITHUB_CLIENT_ID || !envVars.GITHUB?.GITHUB_CLIENT_SECRET) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "GitHub OAuth credentials missing",
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: envVars.GITHUB.GITHUB_CLIENT_ID,
      client_secret: envVars.GITHUB.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Failed to retrieve GitHub token");
  }

  const profileRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = await profileRes.json();

  const emailRes = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const emails = await emailRes.json();
  const primaryEmail =
    Array.isArray(emails) && emails.find((e: any) => e.primary)?.email;

  const user = await AuthServices.socialLoginHandler({
    email: primaryEmail || profile.email,
    provider: "GITHUB",
    providerId: profile.id.toString(),
    name: profile.name || profile.login,
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

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "GitHub login successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

export const AuthControllers = {
  userLogin,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
  googleLoginRedirect,
  googleCallback,
  facebookLoginRedirect,
  facebookCallback,
  githubLoginRedirect,
  githubCallback,
};

