import { Router } from "express";
import userRouter from "../modules/user/user.routes.js";
import authRouter from "../modules/auth/auth.routes.js";
import clinicRouter from "../modules/clinic/clinic.routes.js";
import serviceRouter from "../modules/service/service.routes.js";
import appointmentRouter from "../modules/appointment/appointment.routes.js";
import patientRouter from "../modules/patient/patient.routes.js";
import prescriptionRouter from "../modules/prescription/prescription.routes.js";
import billingRouter from "../modules/billing/billing.routes.js";
import cmsRouter from "../modules/cms/cms.routes.js";
import reportRouter from "../modules/report/report.routes.js";
import analyticsRouter from "../modules/analytics/analytics.routes.js";
import chatRouter from "../modules/chat/chat.routes.js";

export const router = Router();

const moduleRoutes = [
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/clinic",
    route: clinicRouter,
  },
  {
    path: "/public",
    route: clinicRouter,
  },
  {
    path: "/service",
    route: serviceRouter,
  },
  {
    path: "/services",
    route: serviceRouter,
  },
  {
    path: "/appointment",
    route: appointmentRouter,
  },
  {
    path: "/appointments",
    route: appointmentRouter,
  },
  {
    path: "/patient",
    route: patientRouter,
  },
  {
    path: "/prescription",
    route: prescriptionRouter,
  },
  {
    path: "/billing",
    route: billingRouter,
  },
  {
    path: "/cms",
    route: cmsRouter,
  },
  {
    path: "/report",
    route: reportRouter,
  },
  {
    path: "/analytics",
    route: analyticsRouter,
  },
  {
    path: "/chat",
    route: chatRouter,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
