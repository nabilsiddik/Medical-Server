import { Router } from "express";
import { AppointmentControllers } from "./appointment.controllers.js";
import { checkAuth, optionalAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  bookAppointmentSchema,
  walkInBookingSchema,
  updateAppointmentStatusSchema,
} from "./appointment.validations.js";

const appointmentRouter = Router();

// Public: check availability & slots
appointmentRouter.get("/availability", AppointmentControllers.getAvailability);
appointmentRouter.get("/slots", AppointmentControllers.getAvailability);

// Public / Patient: book an appointment (supports logged in patient via optionalAuth)
appointmentRouter.post(
  "/book",
  optionalAuth,
  validateRequest(bookAppointmentSchema),
  AppointmentControllers.bookAppointment,
);

// Public / Patient: live queue status
appointmentRouter.get(
  "/live-queue/:chamberLocationId",
  AppointmentControllers.getLiveQueue,
);
appointmentRouter.get("/queue", AppointmentControllers.getLiveQueue);
appointmentRouter.get("/queue/:chamberLocationId", AppointmentControllers.getLiveQueue);

// Patient: view own appointments
appointmentRouter.get(
  "/my-appointments",
  checkAuth(...Object.values(UserRole)),
  AppointmentControllers.getMyAppointments,
);

// Patient: cancel own appointment (Non-refundable policy, slot released)
appointmentRouter.patch(
  "/:id/cancel",
  checkAuth(...Object.values(UserRole)),
  AppointmentControllers.cancelByPatient,
);

// Doctor Admin: Walk-In Registration
appointmentRouter.post(
  "/walk-in",
  checkAuth(UserRole.ADMIN),
  validateRequest(walkInBookingSchema),
  AppointmentControllers.createWalkIn,
);

// Doctor Admin: Status Change
appointmentRouter.patch(
  "/:id/status",
  checkAuth(UserRole.ADMIN),
  validateRequest(updateAppointmentStatusSchema),
  AppointmentControllers.updateStatus,
);

// Doctor Admin: Cancel with optional refund
appointmentRouter.patch(
  "/:id/doctor-cancel",
  checkAuth(UserRole.ADMIN),
  AppointmentControllers.cancelByDoctor,
);

// Doctor Admin: Refund appointment
appointmentRouter.post(
  "/:id/refund",
  checkAuth(UserRole.ADMIN),
  AppointmentControllers.refundAppointment,
);

// Doctor Admin: Advanced Management Data Table
appointmentRouter.get(
  "/",
  checkAuth(UserRole.ADMIN),
  AppointmentControllers.getAllAppointments,
);

export default appointmentRouter;
