import { Router } from "express";
import { PatientControllers } from "./patient.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { createPatientSchema, recordVitalsSchema } from "./patient.validations.js";

const patientRouter = Router();

// Doctor Admin: View all patients with advanced data table (searching, filtering, sorting, pagination)
patientRouter.get(
  "/",
  checkAuth(UserRole.ADMIN),
  PatientControllers.getAllPatients,
);

// Doctor Admin: Register new patient
patientRouter.post(
  "/",
  checkAuth(UserRole.ADMIN),
  validateRequest(createPatientSchema),
  PatientControllers.createPatient,
);

// Doctor / Patient: View patient profile & clinical timeline
patientRouter.get(
  "/:id",
  checkAuth(UserRole.ADMIN, UserRole.PATIENT),
  PatientControllers.getPatientById,
);

// Doctor Admin: Record vitals
patientRouter.post(
  "/:id/vitals",
  checkAuth(UserRole.ADMIN),
  validateRequest(recordVitalsSchema),
  PatientControllers.recordVitals,
);

// Doctor / Patient: Get vitals trend for charts
patientRouter.get(
  "/:id/vitals/trends",
  checkAuth(UserRole.ADMIN, UserRole.PATIENT),
  PatientControllers.getVitalsTrends,
);

export default patientRouter;
