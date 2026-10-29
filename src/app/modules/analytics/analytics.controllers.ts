import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";
import { AnalyticsServices } from "./analytics.services.js";

const getDoctorAnalyticsOverview = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AnalyticsServices.getDoctorAnalyticsOverview();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Doctor dashboard analytics overview retrieved successfully",
      data: result,
    });
  },
);

export const AnalyticsControllers = {
  getDoctorAnalyticsOverview,
  // Alias for backward compatibility
  getAdminDashboardStats: getDoctorAnalyticsOverview,
};
