import { Router } from "express";
import { ReportControllers } from "./report.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const reportRouter = Router();

// Doctor Admin Dashboard Analytics
reportRouter.get(
  "/dashboard-stats",
  checkAuth(UserRole.ADMIN),
  ReportControllers.getDashboardStats,
);

export default reportRouter;
