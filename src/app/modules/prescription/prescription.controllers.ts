import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { PrescriptionServices } from "./prescription.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";
import { pickQueries } from "../../utils/pickQueries.js";
import AppError from "../../errorHelpers/appError.js";

const searchDrugs = catchAsync(async (req: Request, res: Response) => {
  const query = req.query.query as string;
  const result = await PrescriptionServices.searchDrugs(query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Drugs retrieved successfully",
    data: result,
  });
});

const createDrug = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionServices.createDrug(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Drug added to database",
    data: result,
  });
});

const createPrescription = catchAsync(async (req: Request, res: Response) => {
  const doctorId = req.user!.id;
  const result = await PrescriptionServices.createPrescription(doctorId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Prescription finalized successfully",
    data: result,
  });
});

const getPrescriptionById = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionServices.getPrescriptionById(String(req.params.id));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Prescription details retrieved successfully",
    data: result,
  });
});

const downloadPrescriptionPdf = catchAsync(async (req: Request, res: Response) => {
  const pdfBuffer = await PrescriptionServices.getPrescriptionPdfBuffer(String(req.params.id));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="prescription-${String(req.params.id)}.pdf"`,
  );
  res.send(pdfBuffer);
});

const verifyPrescription = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionServices.verifyPrescription(String(req.params.token));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Prescription verification result",
    data: result,
  });
});

const getAllPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const filters = pickQueries(req.query, ["searchTerm", "patientId"]);
  const options = pickQueries(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await PrescriptionServices.getAllPrescriptions(filters, options);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Prescriptions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }
  const result = await PrescriptionServices.getMyPrescriptions(req.user.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Patient prescriptions retrieved successfully",
    data: result,
  });
});

export const PrescriptionControllers = {
  searchDrugs,
  createDrug,
  createPrescription,
  getPrescriptionById,
  downloadPrescriptionPdf,
  verifyPrescription,
  getAllPrescriptions,
  getMyPrescriptions,
};
