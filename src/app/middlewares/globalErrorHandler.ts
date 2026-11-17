import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { envVars } from "../config/env.config.js";
import { ZodError } from "zod";

interface IErrorDetails {
  path: string | number;
  message: string;
}

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (envVars.NODE_ENV === "development") {
    console.error("🔴 Global Error Handler:", err);
  }

  let statusCode: number = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message: string = err.message || "Internal Server Error";
  let errorSources: IErrorDetails[] = [];
  let error: any = err;

  // 1. Handle Zod Validation Error
  if (err instanceof ZodError || err?.name === "ZodError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation Error";
    errorSources = (err.issues || []).map((issue: any) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    error = errorSources;
  }

  // 2. Handle JWT Errors
  else if (err?.name === "JsonWebTokenError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Invalid token. Please login again.";
  } else if (err?.name === "TokenExpiredError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Token has expired. Please refresh or login again.";
  }

  // 3. Handle Prisma Errors
  else if (err?.name === "PrismaClientKnownRequestError" || err?.code) {
    if (err.code === "P2002") {
      statusCode = StatusCodes.CONFLICT;
      const rawTarget = err.meta?.target;
      let targetNames: string[] = [];
      if (Array.isArray(rawTarget)) {
        targetNames = rawTarget.map((t: any) => String(t));
      } else if (typeof rawTarget === "string") {
        targetNames = [rawTarget];
      }

      const readableFields = targetNames.map((f) => {
        if (f.includes("phoneNumber")) return "Phone Number";
        if (f.includes("email")) return "Email Address";
        if (f.includes("bmdc")) return "BMDC Number";
        return f.replace(/^.*_([a-zA-Z0-9]+)_key$/, "$1");
      });

      message = readableFields.length
        ? `A record with this ${readableFields.join(", ")} already exists. Please use a unique value.`
        : "A duplicate record already exists.";
      error = err.meta;
    } else if (err.code === "P2025") {
      statusCode = StatusCodes.NOT_FOUND;
      message = "Requested record not found in database.";
      error = err.meta;
    } else if (err.code === "P2003") {
      statusCode = StatusCodes.BAD_REQUEST;
      message = "Foreign key constraint failed.";
      error = err.meta;
    } else if (err.code === "P1000") {
      statusCode = StatusCodes.UNAUTHORIZED;
      message = "Database authentication failed.";
      error = err.meta;
    }
  } else if (err?.name === "PrismaClientValidationError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Database validation error.";
    error = err.message;
  } else if (err?.name === "PrismaClientInitializationError") {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Database connection initialization failed.";
    error = err.message;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorSources: errorSources.length ? errorSources : undefined,
    error: envVars.NODE_ENV === "development" ? error : undefined,
    stack: envVars.NODE_ENV === "development" ? err?.stack : undefined,
  });
};

export default globalErrorHandler;