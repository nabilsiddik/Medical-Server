import { Router } from "express";
import { AuthControllers } from "./auth.controllers.js";
import { UserControllers } from "../user/user.controllers.js";
import { UserValidation } from "../user/user.validation.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AuthValidations } from "./auth.validations.js";
import { fileUploader } from "../../utils/fileUploader.js";

const authRouter = Router();

// Register patient (auto-logged in)
authRouter.post(
  "/register",
  fileUploader.upload.single("file"),
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.createUserIntoDb,
);

// User login (Admin Doctor or Patient)
authRouter.post(
  "/login",
  validateRequest(AuthValidations.userLoginZodSchema),
  AuthControllers.userLogin,
);

// Get currently logged-in user profile
authRouter.get(
  "/me",
  checkAuth(...Object.values(UserRole)),
  UserControllers.getMyProfile,
);

// Refresh Token
authRouter.post(
  "/refresh-token",
  validateRequest(AuthValidations.refreshTokenSchema),
  AuthControllers.refreshToken,
);

// Logout
authRouter.post("/logout", AuthControllers.logout);

// Verify email / OTP
authRouter.post(
  "/verify-email",
  validateRequest(AuthValidations.verifyOTPSchema),
  AuthControllers.verifyOtp,
);

// Resend OTP
authRouter.post(
  "/resend-otp",
  validateRequest(AuthValidations.resendOTPSchema),
  AuthControllers.resendOtp,
);

// Forgot Password
authRouter.post(
  "/forgot-password",
  validateRequest(AuthValidations.forgotPasswordSchema),
  AuthControllers.forgotPassword,
);

// Reset Password
authRouter.post(
  "/reset-password",
  validateRequest(AuthValidations.resetPasswordSchema),
  AuthControllers.resetPassword,
);

// Change Password
authRouter.patch(
  "/change-password",
  checkAuth(...Object.values(UserRole)),
  validateRequest(AuthValidations.changePasswordSchema),
  AuthControllers.changePassword,
);

// Google OAuth
authRouter.get("/google", AuthControllers.googleLoginRedirect);
authRouter.get("/google/callback", AuthControllers.googleCallback);

// Facebook OAuth
authRouter.get("/facebook", AuthControllers.facebookLoginRedirect);
authRouter.get("/facebook/callback", AuthControllers.facebookCallback);

// GitHub OAuth
authRouter.get("/github", AuthControllers.githubLoginRedirect);
authRouter.get("/github/callback", AuthControllers.githubCallback);

export default authRouter;
