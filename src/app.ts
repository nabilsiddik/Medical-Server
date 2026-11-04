import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { router } from "./app/routes/index.js";
import { envVars } from "./app/config/env.config.js";
import { notFound } from "./app/middlewares/notFound.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import { isDemoUser } from "./app/utils/demoHelper.js";
import { verifyToken } from "./app/utils/jwtToken.js";
import { prisma } from "./lib/prisma.js";

export const app = express();

// 1. Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 2. Global Rate Limiting (Health and wake-up pings are exempt to support Render stay-awake crons)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path;
    return (
      p === "/" ||
      p === "/health" ||
      p === "/ping" ||
      p === "/api/v1/health" ||
      p === "/api/v1/ping"
    );
  },
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
  max: 60, // Limit each IP to 60 requests per window
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

// 6. Global Demo User Mutation Guard (Blocks all write/modify/delete attempts for demo accounts)
app.use((req: Request, res: Response, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const isAuthExempt =
      req.originalUrl.includes("/auth/login") ||
      req.originalUrl.includes("/auth/logout") ||
      req.originalUrl.includes("/auth/refresh-token");

    if (!isAuthExempt) {
      let token: string | undefined = req.cookies?.accessToken;
      if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
      }
      if (token) {
        try {
          const verified = verifyToken(token, envVars.JWT.JWT_ACCESS_SECRET);
          if (verified && isDemoUser(verified.email, verified.isDemo)) {
            return res.status(403).json({
              success: false,
              statusCode: 403,
              message:
                "Demo Mode: Modifying, creating, or deleting records is disabled for demo accounts. Please contact us to get full software access!",
            });
          }
        } catch {
          // Token invalid, proceed to standard auth handlers
        }
      }
    }
  }
  next();
});

// 7. Root & Health Check / Wake-Up Endpoints (for Render keep-awake, UptimeRobot, Cron-job.org)
const healthHandler = async (req: Request, res: Response) => {
  let dbStatus = "connected";
  if (req.query.db === "true") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (err: any) {
      dbStatus = `disconnected: ${err?.message || "error"}`;
    }
  }

  res.status(200).json({
    status: "healthy",
    message: "Medical backend server is awake and operational.",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: envVars.NODE_ENV,
    ...(req.query.db === "true" ? { database: dbStatus } : {}),
  });
};

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Express Backend API is running smoothly",
    version: "1.0.0",
    environment: envVars.NODE_ENV,
  });
});

// Primary /health and /ping
app.get("/health", healthHandler);
app.head("/health", (req: Request, res: Response) => {
  res.status(200).end();
});
app.get("/ping", (req: Request, res: Response) => {
  res.status(200).send("pong");
});
app.head("/ping", (req: Request, res: Response) => {
  res.status(200).end();
});

// Namespaced /api/v1/health and /api/v1/ping aliases
app.get("/api/v1/health", healthHandler);
app.head("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).end();
});
app.get("/api/v1/ping", (req: Request, res: Response) => {
  res.status(200).send("pong");
});
app.head("/api/v1/ping", (req: Request, res: Response) => {
  res.status(200).end();
});

// 8. Application Routes
app.use("/api/v1", router);

// 9. 404 & Global Error Handling
app.use(notFound);
app.use(globalErrorHandler);
