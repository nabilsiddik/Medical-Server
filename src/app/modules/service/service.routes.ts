import { Router } from "express";
import { ServiceControllers } from "./service.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { createServiceSchema, updateServiceSchema } from "./service.validations.js";

const serviceRouter = Router();

// Public: list appointment types / services and view detail
serviceRouter.get("/", ServiceControllers.getAllServices);
serviceRouter.get("/:slug", ServiceControllers.getServiceBySlug);

// Doctor Admin: create, update, delete appointment types & pricing
serviceRouter.post(
  "/",
  checkAuth(UserRole.ADMIN),
  validateRequest(createServiceSchema),
  ServiceControllers.createService,
);

serviceRouter.patch(
  "/:id",
  checkAuth(UserRole.ADMIN),
  validateRequest(updateServiceSchema),
  ServiceControllers.updateService,
);

serviceRouter.delete(
  "/:id",
  checkAuth(UserRole.ADMIN),
  ServiceControllers.deleteService,
);

export default serviceRouter;
