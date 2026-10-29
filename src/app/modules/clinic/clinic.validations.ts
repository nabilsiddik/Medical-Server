import { z } from "zod";

export const updateClinicSettingsSchema = z.object({
  body: z.object({
    clinicName: z.string().optional(),
    brandName: z.string().optional(),
    doctorName: z.string().min(2).optional(),
    doctorTitle: z.string().optional(),
    specialty: z.string().optional(),
    degrees: z.string().optional(),
    bmdcRegNumber: z.string().optional(),
    bmdcNumber: z.string().optional(),
    experienceYears: z.number().int().min(0).optional(),
    bio: z.string().optional(),
    aboutHtml: z.string().optional(),
    contactPhone: z.string().optional(),
    phone: z.string().optional(),
    emergencyPhone: z.string().optional(),
    email: z.string().email().optional(),
    whatsappNumber: z.string().optional(),
    address: z.string().optional(),
    languages: z.array(z.string()).optional(),
    currency: z.string().optional(),
    currencySymbol: z.string().optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    defaultLanguage: z.string().optional(),

    // Doctor profile additions
    certifications: z.array(z.string()).optional(),
    certificateDocuments: z.any().optional(),
    awards: z.array(z.string()).optional(),
    consultationFee: z.number().int().min(0).optional(),
    videoConsultationFee: z.number().int().min(0).optional(),
    doctorPhoto: z.string().optional(),
    socialLinks: z.record(z.string(), z.string()).optional(),

    // Booking Engine Rules
    defaultBookingMode: z.enum(["SLOT_BASED", "SERIAL_TOKEN"]).optional(),
    defaultSlotDuration: z.number().int().min(5).max(120).optional(),
    bufferBetweenSlots: z.number().int().min(0).max(60).optional(),
    advanceBookingDays: z.number().int().min(1).max(365).optional(),
    minLeadTimeHours: z.number().int().min(0).max(72).optional(),
    followUpDiscountDays: z.number().int().min(0).optional(),
    followUpDiscountPercent: z.number().int().min(0).max(100).optional(),
    noticeBoard: z.string().optional(),

    // Google Sheet & AI
    googleSheetId: z.string().optional(),
    googleSheetUrl: z.string().optional(),
    aiChatEnabled: z.boolean().optional(),
  }),
});

export const updateBrandingSchema = z.object({
  body: z.object({
    brandName: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (!v || v.trim() === "" ? undefined : v.trim())),
    brandTagline: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (!v || v.trim() === "" ? undefined : v.trim())),
    primaryColor: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (!v || v.trim() === "" ? undefined : v.trim())),
    secondaryColor: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (!v || v.trim() === "" ? undefined : v.trim())),
    logoUrl: z.string().optional().nullable(),
    faviconUrl: z.string().optional().nullable(),
  }),
});

export const chamberLocationSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Location name is required"),
    address: z.string().min(3, "Address is required"),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    roomNumber: z.string().optional(),
    floor: z.string().optional(),
    mapCoordinates: z.string().optional(),
    mapEmbedUrl: z.string().optional(),
    bookingMode: z.enum(["SLOT_BASED", "SERIAL_TOKEN"]).optional(),
    dailySerialLimit: z.number().int().min(1).optional(),
    slotDuration: z.number().int().min(5).optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  }),
});

export const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  slotDuration: z.number().int().min(5).max(120).optional(),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
  breaks: z.array(
    z.object({
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
      title: z.string().optional(),
    })
  ).optional(),
  maxPatients: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const scheduleSchema = z.object({
  body: scheduleItemSchema,
});
