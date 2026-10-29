import { z } from "zod";

export const bookAppointmentSchema = z.object({
  body: z.object({
    chamberLocationId: z.string().min(1, "Invalid chamber location ID"),
    serviceId: z.string().min(1, "Invalid service ID").optional(),
    appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    consultationType: z.enum(["IN_PERSON", "VIDEO", "FOLLOW_UP", "HOME_VISIT"]).default("IN_PERSON"),
    bookingSource: z.enum(["WEBSITE", "CHATBOT", "WHATSAPP", "PHONE", "WALK_IN", "ADMIN"]).default("WEBSITE"),

    // Patient info (for guest booking or profile sync)
    fullName: z.string().min(2, "Full name is required"),
    phone: z.string().min(8, "Valid phone number is required"),
    email: z.string().email().optional(),
    age: z.number().int().min(0).max(120).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHERS"]).optional(),
    reasonForVisit: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    preVisitIntake: z.record(z.string(), z.any()).optional(),

    // Optional phone OTP code
    otpCode: z.string().optional(),
  }),
});

export const walkInBookingSchema = z.object({
  body: z.object({
    chamberLocationId: z.string().min(1),
    serviceId: z.string().min(1).optional(),
    fullName: z.string().min(2),
    phone: z.string().min(8),
    age: z.number().int().min(0).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHERS"]).optional(),
    isEmergency: z.boolean().default(false),
    priority: z.number().int().default(0),
    fee: z.number().int().min(0).default(100000),
    isPaid: z.boolean().default(false),
    paymentMethod: z.enum(["CASH", "CARD_ON_SITE", "BKASH", "NAGAD"]).default("CASH"),
  }),
});

export const updateAppointmentStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "IN_CONSULTATION",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
      "RESCHEDULED",
    ]),
    note: z.string().optional(),
    cancelReason: z.string().optional(),
  }),
});
