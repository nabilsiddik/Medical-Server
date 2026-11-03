import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { AppointmentServices } from "./appointment.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";
import { pickQueries } from "../../utils/pickQueries.js";
import AppError from "../../errorHelpers/appError.js";

const getAvailability = catchAsync(async (req: Request, res: Response) => {
  const chamberLocationId = String(req.query.chamberLocationId || req.query.chamberId || "");
  const date = String(req.query.date || req.query.appointmentDate || "");
  const serviceId = req.query.serviceId ? String(req.query.serviceId) : undefined;

  const result = await AppointmentServices.getAvailability(
    chamberLocationId,
    date,
    serviceId,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Availability retrieved successfully",
    data: result,
  });
});

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  req.body.chamberLocationId = req.body.chamberLocationId || req.body.chamberId;
  req.body.fullName = req.body.fullName || req.body.patientName;
  req.body.phone = req.body.phone || req.body.patientPhone;
  if (req.body.age === undefined && req.body.patientAge !== undefined) {
    req.body.age = req.body.patientAge;
  }
  if (req.body.gender === undefined && req.body.patientGender !== undefined) {
    req.body.gender = req.body.patientGender === "OTHER" ? "OTHERS" : req.body.patientGender;
  }

  const currentUserId = req.user?.id;
  const result = await AppointmentServices.bookAppointment(req.body, currentUserId);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Appointment booked successfully",
    data: result,
  });
});

const createWalkIn = catchAsync(async (req: Request, res: Response) => {
  const staffId = req.user?.id;
  const result = await AppointmentServices.createWalkIn(req.body, staffId);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Walk-in patient registered and checked in successfully",
    data: result,
  });
});

const getLiveQueue = catchAsync(async (req: Request, res: Response) => {
  const chamberLocationId = String(req.params.chamberLocationId || req.params.id || "");
  const result = await AppointmentServices.getLiveQueue(chamberLocationId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Live queue data retrieved successfully",
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { status, note, cancelReason } = req.body;
  const staffId = req.user?.id;
  const result = await AppointmentServices.updateStatus(
    String(req.params.id),
    status,
    staffId,
    note,
    cancelReason,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Appointment status updated to ${status}`,
    data: result,
  });
});

// Patient cancels own appointment (Policy: non-refundable, slot made available)
const cancelByPatient = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const { reason } = req.body;
  const result = await AppointmentServices.cancelAppointmentByPatient(
    String(req.params.id),
    req.user.id,
    reason,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Appointment cancelled successfully. Per clinic policy, no refund is provided.",
    data: result,
  });
});

// Doctor cancels appointment with optional refund decision
const cancelByDoctor = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Doctor not authenticated");
  }

  const { reason, refund, refundAmount } = req.body;
  const result = await AppointmentServices.cancelAppointmentByDoctor(
    String(req.params.id),
    req.user.id,
    reason,
    Boolean(refund),
    refundAmount ? Number(refundAmount) : undefined,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Appointment cancelled by doctor successfully",
    data: result,
  });
});

// Doctor explicitly refunds an appointment
const refundAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Doctor not authenticated");
  }

  const { amount, reason } = req.body;
  const result = await AppointmentServices.refundAppointment(
    String(req.params.id),
    req.user.id,
    amount ? Number(amount) : undefined,
    reason,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Refund processed successfully",
    data: result,
  });
});

// Patient views own appointment history
const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const result = await AppointmentServices.getMyAppointments(req.user.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Patient appointments retrieved successfully",
    data: result,
  });
});

// Doctor views all appointments with advanced filtering & pagination
const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
  const filters = pickQueries(req.query, [
    "searchTerm",
    "status",
    "chamberLocationId",
    "serviceId",
    "startDate",
    "endDate",
    "date",
    "isEmergency",
    "paymentStatus",
  ]);
  const options = pickQueries(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await AppointmentServices.getAllAppointments(filters, options);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Appointments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const AppointmentControllers = {
  getAvailability,
  bookAppointment,
  createWalkIn,
  getLiveQueue,
  updateStatus,
  cancelByPatient,
  cancelByDoctor,
  refundAppointment,
  getMyAppointments,
  getAllAppointments,
};
