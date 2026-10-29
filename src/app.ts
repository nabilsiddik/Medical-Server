import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { router } from "./app/routes/index.js";
import { envVars } from "./app/config/env.config.js";
import { notFound } from "./app/middlewares/notFound.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";

export const app = express();

// 1. Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 2. Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});
app.use(globalLimiter);

// 3. Stricter Rate Limiting for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});
app.use("/api/v1/auth", authLimiter);

// 4. CORS Configuration
const allowedOrigins = [
  envVars.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || envVars.NODE_ENV === "development") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: Access from this origin is not allowed."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  }),
);

// 5. Request Body & Cookie Parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

// 6. Root & Health Check Endpoints
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Express Backend API is running smoothly",
    version: "1.0.0",
    environment: envVars.NODE_ENV,
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: envVars.NODE_ENV,
  });
});

// 7. Application Routes
app.use("/api/v1", router);

// 8. 404 & Global Error Handling
app.use(notFound);
app.use(globalErrorHandler);

