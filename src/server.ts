import http, { type Server } from "http";
import { app } from "./app.js";
import { envVars } from "./app/config/env.config.js";
import { prisma } from "./lib/prisma.js";
import { jobScheduler } from "./app/jobs/jobScheduler.js";
import { seedAdminDoctorOnStartup } from "./app/seed/seed.js";
import { initChatSocket } from "./app/modules/chat/chat.socket.js";

let server: Server | null = null;

const startServer = async () => {
  try {
    // 1. Verify database connection
    await prisma.$connect();
    console.log("✅ Database connection established successfully.");

    // 2. Automatically Seed Admin Doctor & Clinic System on Application Startup
    await seedAdminDoctorOnStartup();

    // 3. Initialize Background Job Scheduler
    jobScheduler.init();

    // 4. Create HTTP Server and initialize Socket.io
    const httpServer = http.createServer(app);
    const allowedOrigins = [
      envVars.CLIENT_URL,
      "http://localhost:3000",
      "http://localhost:5173",
    ].filter(Boolean);

    initChatSocket(httpServer, allowedOrigins);

    // 5. Start listening
    server = httpServer.listen(envVars.PORT, () => {
      console.log(`🚀 Server is running on port ${envVars.PORT}`);
      console.log(`🌐 Environment: ${envVars.NODE_ENV}`);
      console.log(`🔗 Local URL: http://localhost:${envVars.PORT}`);
      console.log(`💬 Real-Time Chat & AI Knowledge Base active on Socket.io`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown helper
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("🔌 HTTP server closed.");
      try {
        await prisma.$disconnect();
        console.log("💾 Database connection closed.");
      } catch (err) {
        console.error("Error disconnecting database:", err);
      }
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

// Handle process termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unexpected errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Promise Rejection:", reason);
  gracefulShutdown("unhandledRejection");
});

(async () => {
  await startServer();
})();
