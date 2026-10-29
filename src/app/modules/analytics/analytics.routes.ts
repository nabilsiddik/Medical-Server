import { Router } from "express";
import { AnalyticsControllers } from "./analytics.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const analyticsRouter = Router();

// Doctor Admin Dashboard Analytics Overview
analyticsRouter.get(
  "/overview",
  checkAuth(UserRole.ADMIN),
  AnalyticsControllers.getDoctorAnalyticsOverview,
);

// Backward compatibility alias for /analytics
analyticsRouter.get(
  "/",
  checkAuth(UserRole.ADMIN),
  AnalyticsControllers.getDoctorAnalyticsOverview,
);

export default analyticsRouter;
