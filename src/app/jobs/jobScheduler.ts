import cron from "node-cron";
import { prisma } from "../../lib/prisma.js";
import { envVars } from "../config/env.config.js";
import { getSmsProvider } from "../providers/sms/index.js";
import { getEmailProvider } from "../providers/email/index.js";

class JobScheduler {
  private isRunning = false;

  public init() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (envVars.REDIS_URL) {
      console.log("⚡ [Job Scheduler] Redis configured. BullMQ mode initialized.");
    } else {
      console.log("🕒 [Job Scheduler] Redis not configured. In-process node-cron + DB fallback active.");
    }

    // Cron ticker every 1 minute
    cron.schedule("* * * * *", async () => {
      await this.processPendingJobs();
      await this.checkUpcomingAppointmentReminders();
    });
  }

  // Schedule a future background job
  public async scheduleJob(name: string, payload: any, scheduledAt: Date) {
    return await prisma.backgroundJob.create({
      data: {
        name,
        payload,
        status: "PENDING",
        scheduledAt,
      },
    });
  }

  // Process any pending jobs from the database table
  public async processPendingJobs() {
    try {
      const now = new Date();
      const pendingJobs = await prisma.backgroundJob.findMany({
        where: {
          status: "PENDING",
          scheduledAt: { lte: now },
        },
        take: 10,
      });

      for (const job of pendingJobs) {
        try {
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: "PROCESSING", attempts: { increment: 1 } },
          });

          await this.executeJob(job.name, job.payload);

          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: "COMPLETED", executedAt: new Date() },
          });
        } catch (err: any) {
          console.error(`Error executing job ${job.id} (${job.name}):`, err?.message);
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              lastError: err?.message || "Unknown execution error",
            },
          });
        }
      }
    } catch (err) {
      // Ignore background processing errors
    }
  }

  // Route job execution by name
  private async executeJob(name: string, payload: any) {
    const sms = getSmsProvider();
    const email = getEmailProvider();

    switch (name) {
      case "SEND_SMS":
        if (payload?.to && payload?.message) {
          await sms.sendSms(payload.to, payload.message);
        }
        break;

      case "SEND_EMAIL":
        if (payload?.to && payload?.subject && payload?.html) {
          await email.sendEmail(payload.to, payload.subject, payload.html);
        }
        break;

      default:
        console.log(`[Job Worker] Executed generic task: ${name}`, payload);
        break;
    }
  }

  // Auto-scan upcoming appointments for 24h & 2h reminders
  private async checkUpcomingAppointmentReminders() {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);

      // Find confirmed appointments scheduled between 23h and 24h from now
      const appointments = await prisma.appointment.findMany({
        where: {
          status: "CONFIRMED",
          appointmentDate: {
            gte: in23Hours,
            lte: in24Hours,
          },
        },
        include: {
          patient: true,
          chamberLocation: true,
        },
        take: 20,
      });

      const sms = getSmsProvider();

      for (const apt of appointments) {
        if (apt.patient?.phone) {
          const msg = `Reminder: You have an appointment with ${envVars.BRAND_NAME} tomorrow at ${apt.chamberLocation?.name}. Ref: ${apt.appointmentRef}`;
          await sms.sendSms(apt.patient.phone, msg);
        }
      }
    } catch {
      // Silently continue
    }
  }
}

export const jobScheduler = new JobScheduler();
