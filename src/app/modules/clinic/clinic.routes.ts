import { Router } from "express";
import { ClinicControllers } from "./clinic.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  updateClinicSettingsSchema,
  updateBrandingSchema,
  chamberLocationSchema,
} from "./clinic.validations.js";

const clinicRouter = Router();

// Public Cacheable Site Config & Doctor Profile
clinicRouter.get("/site-config", ClinicControllers.getPublicSiteConfig);
clinicRouter.get("/doctor-profile", ClinicControllers.getPublicSiteConfig);

// Clinic Settings & Doctor Profile (Doctor Admin)
clinicRouter.get(
  "/settings",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.getClinicSettings,
);

clinicRouter.patch(
  "/settings",
  checkAuth(UserRole.ADMIN),
  validateRequest(updateClinicSettingsSchema),
  ClinicControllers.updateClinicSettings,
);

// Branding
clinicRouter.patch(
  "/branding",
  checkAuth(UserRole.ADMIN),
  validateRequest(updateBrandingSchema),
  ClinicControllers.updateBranding,
);

// Chamber Locations / Chambers CRUD
clinicRouter.get("/locations", ClinicControllers.getChamberLocations);
clinicRouter.get("/chambers", ClinicControllers.getChamberLocations);

clinicRouter.post(
  "/locations",
  checkAuth(UserRole.ADMIN),
  validateRequest(chamberLocationSchema),
  ClinicControllers.createChamberLocation,
);
clinicRouter.post(
  "/chambers",
  checkAuth(UserRole.ADMIN),
  validateRequest(chamberLocationSchema),
  ClinicControllers.createChamberLocation,
);

clinicRouter.patch(
  "/locations/:id",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.updateChamberLocation,
);
clinicRouter.patch(
  "/chambers/:id",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.updateChamberLocation,
);

clinicRouter.delete(
  "/locations/:id",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.deleteChamberLocation,
);
clinicRouter.delete(
  "/chambers/:id",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.deleteChamberLocation,
);

// Chamber Schedules (with multiple break slots)
clinicRouter.post(
  "/locations/:id/schedules",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.updateLocationSchedules,
);
clinicRouter.post(
  "/chambers/:id/schedules",
  checkAuth(UserRole.ADMIN),
  ClinicControllers.updateLocationSchedules,
);

export default clinicRouter;
