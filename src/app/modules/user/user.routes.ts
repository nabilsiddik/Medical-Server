import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest.js";
import { UserValidation } from "./user.validation.js";
import { UserControllers } from "./user.controllers.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { fileUploader } from "../../utils/fileUploader.js";
import { checkAuth } from "../../middlewares/checkAuth.js";

const userRouter = Router();

// Register user (patient)
userRouter.post(
  "/register",
  fileUploader.upload.single("file"),
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.createUserIntoDb,
);

// Get current user profile (Admin doctor or Patient)
userRouter.get(
  "/profile",
  checkAuth(...Object.values(UserRole)),
  UserControllers.getMyProfile,
);

// Update current user profile
userRouter.patch(
  "/profile",
  checkAuth(...Object.values(UserRole)),
  fileUploader.upload.single("file"),
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserControllers.updateMyProfile,
);

// Delete own account
userRouter.delete(
  "/profile",
  checkAuth(...Object.values(UserRole)),
  UserControllers.deleteMyAccount,
);

// Get all users (Doctor / Admin)
userRouter.get(
  "/",
  checkAuth(UserRole.ADMIN),
  UserControllers.getAllUsers,
);

// Get user stats (Doctor / Admin)
userRouter.get(
  "/stats",
  checkAuth(UserRole.ADMIN),
  UserControllers.getUserStats,
);

// Get user by id (Doctor / Admin)
userRouter.get(
  "/:id",
  checkAuth(UserRole.ADMIN),
  UserControllers.getUserById,
);

// Soft delete user by doctor / admin
userRouter.patch(
  "/soft-delete/:id",
  checkAuth(UserRole.ADMIN),
  UserControllers.softDeleteUser,
);

// Update user status by doctor / admin
userRouter.patch(
  "/update-status/:id",
  checkAuth(UserRole.ADMIN),
  validateRequest(UserValidation.updateStatusValidationSchema),
  UserControllers.updateUserStatus,
);

// Update user role by Doctor Admin
userRouter.patch(
  "/update-role/:id",
  checkAuth(UserRole.ADMIN),
  validateRequest(UserValidation.updateRoleValidationSchema),
  UserControllers.updateUserRole,
);

export default userRouter;
