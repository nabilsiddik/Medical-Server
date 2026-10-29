import { prisma } from "../../../lib/prisma.js";
import { envVars } from "../../config/env.config.js";
import { generateBrandPalette } from "../../utils/colorScale.js";
import { getFeatureFlags } from "../../config/featureFlags.js";

// Ensure clinic settings record exists (or create from defaults/env)
export const getOrCreateClinicSettings = async () => {
  let settings = await prisma.clinicSetting.findFirst();

  if (!settings) {
    settings = await prisma.clinicSetting.create({
      data: {
        doctorName: process.env.DOCTOR_NAME || "Prof. Dr. Sarah Rahman",
        doctorTitle: "Senior Consultant Physician & Cardiologist",
        specialty: "Internal Medicine & Preventive Cardiology",
        degrees: "MBBS, FCPS (Medicine), MD (Cardiology), MRCP (UK)",
        bmdcNumber: "A-54321",
        experienceYears: 16,
        bio: "Dedicated specialist with over 16 years of clinical excellence in Dhaka, providing world-class and compassionate healthcare.",
        phone: "+880 1700-000000",
        emergencyPhone: "+880 1700-111111",
        email: envVars.EMAIL_SENDER_EMAIL || "doctor@chamber.com",
        brandName: envVars.BRAND_NAME,
        brandTagline: envVars.BRAND_TAGLINE,
        primaryColor: envVars.BRAND_PRIMARY_COLOR,
        secondaryColor: envVars.BRAND_SECONDARY_COLOR,
        logoUrl: envVars.BRAND_LOGO_URL,
        faviconUrl: envVars.BRAND_FAVICON_URL,
        consultationFee: 1000,
        videoConsultationFee: 800,
      },
    });
  }

  return settings;
};

// Public Cacheable Site Configuration
const getPublicSiteConfig = async () => {
  const settings = await getOrCreateClinicSettings();
  const palette = generateBrandPalette(settings.primaryColor, settings.secondaryColor);
  const locations = await prisma.chamberLocation.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      schedules: {
        where: { isActive: true },
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      durationMinutes: true,
      price: true,
      followUpPrice: true,
      consultationType: true,
      isFeatured: true,
    },
  });

  const features = getFeatureFlags();

  return {
    branding: {
      brandName: settings.brandName,
      brandTagline: settings.brandTagline,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      primaryForeground: palette.primaryForeground,
      secondaryForeground: palette.secondaryForeground,
      primaryScale: palette.primaryScale,
      secondaryScale: palette.secondaryScale,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
    },
    doctor: {
      name: settings.doctorName,
      title: settings.doctorTitle,
      specialty: settings.specialty,
      degrees: settings.degrees,
      bmdcNumber: settings.bmdcNumber,
      experienceYears: settings.experienceYears,
      bio: settings.bio,
      aboutHtml: settings.aboutHtml,
      languages: settings.languages,
      certifications: settings.certifications,
      certificateDocuments: settings.certificateDocuments,
      awards: settings.awards,
      consultationFee: settings.consultationFee,
      videoConsultationFee: settings.videoConsultationFee,
      doctorPhoto: settings.doctorPhoto,
      socialLinks: settings.socialLinks,
    },
    contact: {
      phone: settings.phone,
      emergencyPhone: settings.emergencyPhone,
      email: settings.email,
      whatsappNumber: settings.whatsappNumber,
      address: settings.address,
    },
    locale: {
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      defaultLanguage: settings.defaultLanguage,
    },
    bookingRules: {
      defaultBookingMode: settings.defaultBookingMode,
      defaultSlotDuration: settings.defaultSlotDuration,
      advanceBookingDays: settings.advanceBookingDays,
      minLeadTimeHours: settings.minLeadTimeHours,
      requirePrepayment: settings.requirePrepayment,
      depositAmount: settings.depositAmount,
      noticeBoard: settings.noticeBoard,
    },
    locations,
    chambers: locations,
    services,
    features,
  };
};

// Update full clinic settings & doctor profile
const updateClinicSettings = async (data: any) => {
  const current = await getOrCreateClinicSettings();
  return await prisma.clinicSetting.update({
    where: { id: current.id },
    data,
  });
};

// Update only branding
const updateBranding = async (data: {
  brandName?: string;
  brandTagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
}) => {
  const current = await getOrCreateClinicSettings();
  return await prisma.clinicSetting.update({
    where: { id: current.id },
    data,
  });
};

// Chamber locations CRUD
const getChamberLocations = async () => {
  return await prisma.chamberLocation.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      schedules: {
        orderBy: { dayOfWeek: "asc" },
      },
      scheduleExceptions: {
        orderBy: { date: "asc" },
      },
    },
  });
};

const createChamberLocation = async (data: any) => {
  return await prisma.chamberLocation.create({
    data,
    include: {
      schedules: true,
    },
  });
};

const updateChamberLocation = async (id: string, data: any) => {
  return await prisma.chamberLocation.update({
    where: { id },
    data,
    include: {
      schedules: true,
    },
  });
};

const deleteChamberLocation = async (id: string) => {
  return await prisma.chamberLocation.delete({
    where: { id },
  });
};

const updateLocationSchedules = async (
  chamberLocationId: string,
  schedules: any[],
) => {
  // Replace location's schedules in a transaction
  return await prisma.$transaction(async (tx) => {
    await tx.schedule.deleteMany({ where: { chamberLocationId } });
    if (schedules && schedules.length > 0) {
      await tx.schedule.createMany({
        data: schedules.map((s) => ({
          chamberLocationId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration || null,
          breakStartTime: s.breakStartTime || null,
          breakEndTime: s.breakEndTime || null,
          breaks: s.breaks ? s.breaks : null,
          maxPatients: s.maxPatients || null,
          isActive: s.isActive ?? true,
        })),
      });
    }
    return await tx.schedule.findMany({
      where: { chamberLocationId },
      orderBy: { dayOfWeek: "asc" },
    });
  });
};

const addScheduleException = async (
  chamberLocationId: string,
  data: { date: Date; isClosed?: boolean; reason?: string },
) => {
  return await prisma.scheduleException.create({
    data: {
      chamberLocationId,
      date: data.date,
      isClosed: data.isClosed ?? true,
      reason: data.reason || null,
    },
  });
};

export const ClinicServices = {
  getOrCreateClinicSettings,
  getPublicSiteConfig,
  updateClinicSettings,
  updateBranding,
  getChamberLocations,
  createChamberLocation,
  updateChamberLocation,
  deleteChamberLocation,
  updateLocationSchedules,
  addScheduleException,
};
