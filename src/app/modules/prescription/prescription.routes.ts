import { Router } from "express";
import { PrescriptionControllers } from "./prescription.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  createPrescriptionSchema,
  createDrugSchema,
} from "./prescription.validations.js";

const prescriptionRouter = Router();

// Public QR Code Verification endpoint
prescriptionRouter.get(
  "/verify/:token",
  PrescriptionControllers.verifyPrescription,
);

// Drug Search / Autocomplete (Doctor Admin)
prescriptionRouter.get(
  "/drugs",
  checkAuth(UserRole.ADMIN),
  PrescriptionControllers.searchDrugs,
);

// Add Drug to Database (Doctor Admin)
prescriptionRouter.post(
  "/drugs",
  checkAuth(UserRole.ADMIN),
  validateRequest(createDrugSchema),
  PrescriptionControllers.createDrug,
);

// Patient: View own prescriptions
prescriptionRouter.get(
  "/patient/my-prescriptions",
  checkAuth(...Object.values(UserRole)),
  PrescriptionControllers.getMyPrescriptions,
);

// Create Prescription (Doctor Admin Only)
prescriptionRouter.post(
  "/",
  checkAuth(UserRole.ADMIN),
  validateRequest(createPrescriptionSchema),
  PrescriptionControllers.createPrescription,
);

// Global Prescription Data Table (Doctor Admin)
prescriptionRouter.get(
  "/",
  checkAuth(UserRole.ADMIN),
  PrescriptionControllers.getAllPrescriptions,
);

// Download Branded Prescription PDF (Doctor Admin & Patient)
prescriptionRouter.get(
  "/:id/pdf",
  checkAuth(...Object.values(UserRole)),
  PrescriptionControllers.downloadPrescriptionPdf,
);

// Get Prescription by ID (Doctor Admin & Patient)
prescriptionRouter.get(
  "/:id",
  checkAuth(...Object.values(UserRole)),
  PrescriptionControllers.getPrescriptionById,
);

export default prescriptionRouter;
