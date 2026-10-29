import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { ClinicServices } from "./clinic.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";

// Public Site Config (Section 2)
const getPublicSiteConfig = catchAsync(async (_req: Request, res: Response) => {
  const result = await ClinicServices.getPublicSiteConfig();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Site configuration retrieved successfully",
    data: result,
  });
});

// Clinic Settings
const getClinicSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await ClinicServices.getOrCreateClinicSettings();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Clinic settings retrieved successfully",
    data: result,
  });
});

const updateClinicSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicServices.updateClinicSettings(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Clinic settings updated successfully",
    data: result,
  });
});

const updateBranding = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicServices.updateBranding(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Branding updated successfully",
    data: result,
  });
});

// Locations
const getChamberLocations = catchAsync(async (_req: Request, res: Response) => {
  const result = await ClinicServices.getChamberLocations();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chamber locations retrieved successfully",
    data: result,
  });
});

const createChamberLocation = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicServices.createChamberLocation(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Chamber location created successfully",
    data: result,
  });
});

const updateChamberLocation = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicServices.updateChamberLocation(String(req.params.id), req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chamber location updated successfully",
    data: result,
  });
});

const deleteChamberLocation = catchAsync(async (req: Request, res: Response) => {
  await ClinicServices.deleteChamberLocation(String(req.params.id));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chamber location deleted successfully",
    data: null,
  });
});

const updateLocationSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicServices.updateLocationSchedules(
    String(req.params.id),
    req.body.schedules,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Weekly schedule updated successfully",
    data: result,
  });
});

export const ClinicControllers = {
  getPublicSiteConfig,
  getClinicSettings,
  updateClinicSettings,
  updateBranding,
  getChamberLocations,
  createChamberLocation,
  updateChamberLocation,
  deleteChamberLocation,
  updateLocationSchedules,
};
