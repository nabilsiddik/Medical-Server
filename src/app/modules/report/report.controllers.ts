import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { ReportServices } from "./report.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const result = await ReportServices.getDashboardStats(
    startDate as string,
    endDate as string,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Dashboard practice analytics retrieved successfully",
    data: result,
  });
});

export const ReportControllers = {
  getDashboardStats,
};
