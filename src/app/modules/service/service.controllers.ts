import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { ServiceServices } from "./service.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";

const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === "true";
  const result = await ServiceServices.getAllServices(includeInactive);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Services retrieved successfully",
    data: result,
  });
});

const getServiceBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.getServiceBySlug(String(req.params.slug));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service details retrieved successfully",
    data: result,
  });
});

const createService = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.createService(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Service created successfully",
    data: result,
  });
});

const updateService = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.updateService(String(req.params.id), req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service updated successfully",
    data: result,
  });
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
  await ServiceServices.deleteService(String(req.params.id));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service deleted successfully",
    data: null,
  });
});

export const ServiceControllers = {
  getAllServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
};
