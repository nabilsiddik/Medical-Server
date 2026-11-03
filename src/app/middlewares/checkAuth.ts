import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwtToken.js";
import { envVars } from "../config/env.config.js";
import AppError from "../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import type { JWTPayload } from "../interfaces/index.js";
import type { UserRole } from "../../generated/prisma/enums.js";
import { isDemoUser } from "../utils/demoHelper.js";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const checkAuth = (...roles: (UserRole | string)[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token: string | undefined;

      if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
      } else if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        } else {
          token = authHeader;
        }
      }

      if (!token) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication token is required");
      }

      const verifiedToken = verifyToken(
        token,
        envVars.JWT.JWT_ACCESS_SECRET,
      ) as JWTPayload;

      if (!verifiedToken || !verifiedToken.id) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired token");
      }

      req.user = verifiedToken;

      if (roles.length > 0 && !roles.includes(verifiedToken.role)) {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          "You are not authorized to access this resource",
        );
      }

      // Restrict demo accounts from any mutating actions
      if (
        isDemoUser(verifiedToken.email, verifiedToken.isDemo) &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
      ) {
        const isAuthExempt =
          req.originalUrl.includes("/auth/logout") ||
          req.originalUrl.includes("/auth/refresh-token");

        if (!isAuthExempt) {
          throw new AppError(
            StatusCodes.FORBIDDEN,
            "Demo Mode: Modifying, creating, or deleting records is disabled for demo accounts. Please contact us to get full software access!",
          );
        }
      }

      next();
    } catch (err: unknown) {
      next(err);
    }
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      } else {
        token = authHeader;
      }
    }

    if (token) {
      try {
        const verifiedToken = verifyToken(
          token,
          envVars.JWT.JWT_ACCESS_SECRET,
        ) as JWTPayload;
        if (verifiedToken?.id) {
          req.user = verifiedToken;

          // Block demo user from mutating public actions (e.g. appointment booking)
          if (
            isDemoUser(verifiedToken.email, verifiedToken.isDemo) &&
            ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
          ) {
            const isAuthExempt =
              req.originalUrl.includes("/auth/logout") ||
              req.originalUrl.includes("/auth/refresh-token");

            if (!isAuthExempt) {
              throw new AppError(
                StatusCodes.FORBIDDEN,
                "Demo Mode: Modifying, creating, or deleting records is disabled for demo accounts. Please contact us to get full software access!",
              );
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof AppError) {
          throw err;
        }
        // Token invalid, proceed as guest
      }
    }

    next();
  } catch (err: unknown) {
    next(err);
  }
};
