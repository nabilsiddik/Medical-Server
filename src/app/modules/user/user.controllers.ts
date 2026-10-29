import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { UserServices } from "./user.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { userFilterableFields } from "./user.constants.js";
import { StatusCodes } from "http-status-codes";
import { pickQueries } from "../../utils/pickQueries.js";
import type { JWTPayload } from "../../interfaces/index.js";
import AppError from "../../errorHelpers/appError.js";
import { envVars } from "../../config/env.config.js";

const cookieOptions = {
  secure: envVars.NODE_ENV === "production",
  httpOnly: true,
  sameSite: envVars.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
};

// Create user (Patient registration with auto-login)
const createUserIntoDb = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File;
  const result = await UserServices.createUserIntoDb(req.body, file);

  if (result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, cookieOptions);
  }
  if (result.accessToken) {
    res.cookie("accessToken", result.accessToken, cookieOptions);
  }

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.message,
    data: result,
  });
});

// Get all users from database (Admin)
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pickQueries(req.query, userFilterableFields);
  const options = pickQueries(req.query, [
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ]);

  const result = await UserServices.getAllUsers(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get user profile info
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const result = await UserServices.getMyProfile(req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

// Get user by id (Admin)
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;

  if (!userId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User id is required");
  }

  const result = await UserServices.getUserById(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

// Update own profile
const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const file = req.file as Express.Multer.File;
  const result = await UserServices.updateMyProfile(req.user, req.body, file);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

// Delete own account (Soft delete)
const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  await UserServices.deleteMyAccount(req.user);

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Account deleted successfully",
    data: null,
  });
});

// Soft delete user by admin
const softDeleteUser = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const result = await UserServices.softDeleteUser(
    req.params.id as string,
    req.user,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User soft-deleted successfully",
    data: result,
  });
});

// Update user status by admin
const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const result = await UserServices.updateUserStatus(
    req.params.id as string,
    req.body.status,
    req.user,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

// Update user role by Admin
const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const result = await UserServices.updateUserRole(
    req.params.id as string,
    req.body.role,
    req.user,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

// Get user statistics
const getUserStats = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getUserStats(req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User statistics retrieved successfully",
    data: result,
  });
});

export const UserControllers = {
  createUserIntoDb,
  getAllUsers,
  getMyProfile,
  getUserById,
  updateMyProfile,
  deleteMyAccount,
  softDeleteUser,
  updateUserStatus,
  updateUserRole,
  getUserStats,
};
