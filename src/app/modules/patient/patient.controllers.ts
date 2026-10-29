import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { PatientServices } from "./patient.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";
import { pickQueries } from "../../utils/pickQueries.js";

const getAllPatients = catchAsync(async (req: Request, res: Response) => {
  const filters = pickQueries(req.query, ["searchTerm", "gender", "bloodGroup"]);
  const options = pickQueries(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await PatientServices.getAllPatients(filters, options);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Patients retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createPatient = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientServices.createPatient(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Patient registered successfully",
    data: result,
  });
});

const getPatientById = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientServices.getPatientById(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Patient details & timeline retrieved successfully",
    data: result,
  });
});

const recordVitals = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientServices.recordVitals(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Vitals recorded successfully",
    data: result,
  });
});

const getVitalsTrends = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientServices.getVitalsTrends(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Vitals trends retrieved successfully",
    data: result,
  });
});

export const PatientControllers = {
  getAllPatients,
  createPatient,
  getPatientById,
  recordVitals,
  getVitalsTrends,
};
