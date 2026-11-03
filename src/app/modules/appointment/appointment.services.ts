import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcryptjs";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import {
  AppointmentStatus,
  AppointmentBookingMode,
  UserRole,
  UserStatus,
  Gender,
  PaymentStatus,
} from "../../../generated/prisma/enums.js";
import calculatePagination, { type IOptions } from "../../utils/paginations.js";
import { getVideoProvider } from "../../providers/video/index.js";
import { getSmsProvider } from "../../providers/sms/index.js";
import { getEmailProvider } from "../../providers/email/index.js";
import { envVars } from "../../config/env.config.js";

// Helper to format minutes into HH:mm
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Helper to parse HH:mm into total minutes from midnight
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

// 1. Get Availability for Chamber & Date (with multiple break intervals)
const getAvailability = async (chamberLocationId: string, dateStr: string, serviceId?: string) => {
  if (!chamberLocationId || !dateStr) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Chamber ID and Date (YYYY-MM-DD) are required.");
  }

  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay();

  // Check if closed by exception
  const exception = await prisma.scheduleException.findFirst({
    where: {
      chamberLocationId,
      date: targetDate,
    },
  });

  if (exception?.isClosed) {
    return {
      isAvailable: false,
      reason: exception.reason || "Doctor chamber is closed on this date.",
      slots: [],
    };
  }

  // Find weekly schedule for this chamber & day of week
  const schedule = await prisma.schedule.findFirst({
    where: {
      chamberLocationId,
      dayOfWeek,
      isActive: true,
    },
    include: {
      chamberLocation: true,
    },
  });

  if (!schedule) {
    return {
      isAvailable: false,
      reason: "No consultation schedule on this day of the week for this chamber.",
      slots: [],
    };
  }

  const location = schedule.chamberLocation;
  const bookingMode = location.bookingMode;

  // Handle SERIAL_TOKEN mode
  if (bookingMode === AppointmentBookingMode.SERIAL_TOKEN) {
    const bookedCount = await prisma.appointment.count({
      where: {
        chamberLocationId,
        appointmentDate: targetDate,
        status: { notIn: [AppointmentStatus.CANCELLED] },
      },
    });

    const maxLimit = schedule.maxPatients || location.dailySerialLimit || 40;
    const isFull = bookedCount >= maxLimit;

    return {
      isAvailable: !isFull,
      bookingMode: "SERIAL_TOKEN",
      totalBooked: bookedCount,
      maxLimit,
      nextSerial: bookedCount + 1,
      estimatedTimePerPatient: schedule.slotDuration || location.slotDuration || 15,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    };
  }

  // Handle SLOT_BASED mode with Dynamic Time-Blocking (No Patient Overlap)
  // 1. Resolve required duration from service or fallback to schedule duration
  let requiredDuration = schedule.slotDuration || location.slotDuration || 15;
  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { durationMinutes: true, name: true },
    });
    if (service?.durationMinutes && service.durationMinutes > 0) {
      requiredDuration = service.durationMinutes;
    }
  }

  // 2. Fetch all active booked appointments on this date with their time intervals
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      chamberLocationId,
      appointmentDate: targetDate,
      status: { notIn: [AppointmentStatus.CANCELLED] },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      service: {
        select: { durationMinutes: true },
      },
    },
  });

  const bookedIntervals: { start: number; end: number }[] = [];
  for (const app of bookedAppointments) {
    if (!app.startTime) continue;
    const appStart = timeToMinutes(app.startTime);
    let appEnd: number;
    if (app.endTime) {
      appEnd = timeToMinutes(app.endTime);
    } else {
      appEnd = appStart + (app.service?.durationMinutes || schedule.slotDuration || 15);
    }
    bookedIntervals.push({ start: appStart, end: appEnd });
  }

  // 3. Resolve all Doctor Break intervals
  const breakIntervals: { start: number; end: number; title: string }[] = [];
  if (schedule.breakStartTime && schedule.breakEndTime) {
    breakIntervals.push({
      start: timeToMinutes(schedule.breakStartTime),
      end: timeToMinutes(schedule.breakEndTime),
      title: "Doctor Break",
    });
  }

  if (schedule.breaks && Array.isArray(schedule.breaks)) {
    for (const b of schedule.breaks as any[]) {
      if (b.startTime && b.endTime) {
        breakIntervals.push({
          start: timeToMinutes(b.startTime),
          end: timeToMinutes(b.endTime),
          title: b.title || "Doctor Break",
        });
      }
    }
  }

  const startMin = timeToMinutes(schedule.startTime);
  const endMin = timeToMinutes(schedule.endTime);

  // Granular step: step by base slot duration or service duration (ensures all valid start times are available)
  const baseStep = schedule.slotDuration || location.slotDuration || 15;
  const step = (requiredDuration < baseStep && requiredDuration > 0) ? requiredDuration : baseStep;

  // Check if today: past time slots should not be bookable
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const isToday = dateStr === todayStr;
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

  const slots: {
    time: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    isAvailable: boolean;
    isBooked: boolean;
    isBreak: boolean;
    breakTitle?: string | null;
    isPast: boolean;
  }[] = [];

  for (let m = startMin; m + requiredDuration <= endMin; m += step) {
    const candidateStart = m;
    const candidateEnd = m + requiredDuration;
    const timeStr = minutesToTime(candidateStart);
    const endTimeStr = minutesToTime(candidateEnd);

    // Overlap condition with breaks: candidateStart < break.end && candidateEnd > break.start
    const activeBreak = breakIntervals.find(
      (b) => candidateStart < b.end && candidateEnd > b.start,
    );

    // Overlap condition with booked appointments: candidateStart < app.end && candidateEnd > app.start
    const hasBookingOverlap = bookedIntervals.some(
      (b) => candidateStart < b.end && candidateEnd > b.start,
    );

    const isPast = isToday && candidateStart <= currentMinutesFromMidnight;
    const isBreak = !!activeBreak;
    const isBooked = hasBookingOverlap;
    const isAvailable = !isPast && !isBreak && !isBooked;

    slots.push({
      time: timeStr,
      startTime: timeStr,
      endTime: endTimeStr,
      durationMinutes: requiredDuration,
      isBooked,
      isBreak,
      breakTitle: activeBreak?.title || null,
      isPast,
      isAvailable,
    });
  }

  return {
    isAvailable: slots.some((s) => s.isAvailable),
    isClosed: false,
    bookingMode: "SLOT_BASED",
    chamber: {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
    },
    date: dateStr,
    totalSlots: slots.length,
    availableSlotsCount: slots.filter((s) => s.isAvailable).length,
    bookedSlotsCount: slots.filter((s) => s.isBooked).length,
    breakSlotsCount: slots.filter((s) => s.isBreak).length,
    slots,
  };
};

// 2. Book Appointment (Guest / Registered Patient with atomic double-booking lock)
const bookAppointment = async (data: any, currentUserId?: string) => {
  const targetDate = new Date(`${data.appointmentDate}T00:00:00.000Z`);

  return await prisma.$transaction(async (tx) => {
    // 1. Verify chamber location
    const location = await tx.chamberLocation.findUnique({
      where: { id: data.chamberLocationId },
    });

    if (!location || !location.isActive) {
      throw new AppError(StatusCodes.NOT_FOUND, "Chamber location not found or inactive.");
    }

    // 2. Dynamic Time-Blocking & Strict No-Overlap Validation for SLOT_BASED
    let computedEndTimeStr: string | null = null;
    if (location.bookingMode === AppointmentBookingMode.SLOT_BASED && data.startTime) {
      const schedule = await tx.schedule.findFirst({
        where: {
          chamberLocationId: data.chamberLocationId,
          dayOfWeek: targetDate.getUTCDay(),
          isActive: true,
        },
      });

      if (!schedule) {
        throw new AppError(StatusCodes.BAD_REQUEST, "No consultation schedule for this chamber on selected date.");
      }

      // Resolve service duration
      let serviceDuration = schedule.slotDuration || location.slotDuration || 15;
      if (data.serviceId) {
        const service = await tx.service.findUnique({
          where: { id: data.serviceId },
          select: { durationMinutes: true },
        });
        if (service?.durationMinutes && service.durationMinutes > 0) {
          serviceDuration = service.durationMinutes;
        }
      }

      const candidateStart = timeToMinutes(data.startTime);
      const candidateEnd = candidateStart + serviceDuration;
      computedEndTimeStr = minutesToTime(candidateEnd);

      // Check schedule closing boundary
      const scheduleEnd = timeToMinutes(schedule.endTime);
      if (candidateEnd > scheduleEnd) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Selected consultation requires ${serviceDuration} minutes, which exceeds doctor's closing time (${schedule.endTime}).`,
        );
      }

      // Check break intervals overlap
      const breakIntervals: { start: number; end: number; title: string }[] = [];
      if (schedule.breakStartTime && schedule.breakEndTime) {
        breakIntervals.push({
          start: timeToMinutes(schedule.breakStartTime),
          end: timeToMinutes(schedule.breakEndTime),
          title: "Doctor Break",
        });
      }
      if (schedule.breaks && Array.isArray(schedule.breaks)) {
        for (const b of schedule.breaks as any[]) {
          if (b.startTime && b.endTime) {
            breakIntervals.push({
              start: timeToMinutes(b.startTime),
              end: timeToMinutes(b.endTime),
              title: b.title || "Doctor Break",
            });
          }
        }
      }

      const activeBreak = breakIntervals.find(
        (b) => candidateStart < b.end && candidateEnd > b.start,
      );
      if (activeBreak) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Selected consultation window (${data.startTime} - ${computedEndTimeStr}) overlaps with doctor's break (${activeBreak.title}).`,
        );
      }

      // Check appointment overlap against all active bookings (NO OVERLAP)
      const existingAppointments = await tx.appointment.findMany({
        where: {
          chamberLocationId: data.chamberLocationId,
          appointmentDate: targetDate,
          status: { notIn: [AppointmentStatus.CANCELLED] },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          service: { select: { durationMinutes: true } },
        },
      });

      const overlappingApp = existingAppointments.find((app) => {
        if (!app.startTime) return false;
        const appStart = timeToMinutes(app.startTime);
        let appEnd: number;
        if (app.endTime) {
          appEnd = timeToMinutes(app.endTime);
        } else {
          appEnd = appStart + (app.service?.durationMinutes || schedule.slotDuration || 15);
        }

        // Two intervals overlap if candidateStart < appEnd && candidateEnd > appStart
        return candidateStart < appEnd && candidateEnd > appStart;
      });

      if (overlappingApp) {
        throw new AppError(
          StatusCodes.CONFLICT,
          `This appointment slot (${data.startTime} - ${computedEndTimeStr}) overlaps with an existing patient reservation. Please select another slot.`,
        );
      }
    }

    // 3. Sequential serial / token calculation for the chamber on target date
    const appointmentCount = await tx.appointment.count({
      where: {
        chamberLocationId: data.chamberLocationId,
        appointmentDate: targetDate,
        status: { notIn: [AppointmentStatus.CANCELLED] },
      },
    });
    const serialNumber = appointmentCount + 1;

    // 4. Resolve User and Patient records
    let user = null;
    if (currentUserId) {
      user = await tx.user.findUnique({
        where: { id: currentUserId },
        include: { patient: true },
      });
    }

    if (!user && data.email) {
      user = await tx.user.findFirst({
        where: { email: data.email.toLowerCase().trim(), isDeleted: false },
        include: { patient: true },
      });
    }

    const cleanInputPhone = data.phone ? data.phone.replace(/[^0-9]/g, "") : "";
    const last10Digits = cleanInputPhone && cleanInputPhone.length >= 10 ? cleanInputPhone.slice(-10) : cleanInputPhone;

    if (!user && data.phone) {
      user = await tx.user.findFirst({
        where: {
          OR: [
            { phoneNumber: data.phone },
            ...(cleanInputPhone ? [{ phoneNumber: cleanInputPhone }] : []),
            ...(last10Digits ? [{ phoneNumber: { contains: last10Digits } }] : []),
          ],
          isDeleted: false,
        },
        include: { patient: true },
      });
    }

    // If user does not exist, automatically create a patient account
    if (!user) {
      const cleanPhone = cleanInputPhone;
      const accountEmail = data.email
        ? data.email.toLowerCase().trim()
        : `${cleanPhone || Date.now()}@patient.carepractice.com`;

      const defaultPassword = "Patient@123456";
      const hashedPassword = await bcrypt.hash(defaultPassword, Number(envVars.SALT_ROUND || 10));

      user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: accountEmail,
          phoneNumber: data.phone,
          gender: data.gender || Gender.MALE,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          isPhoneVerified: false,
          authAccounts: {
            create: {
              provider: "CREDENTIAL",
              providerAccountId: accountEmail,
              password: hashedPassword,
            },
          },
        },
        include: {
          patient: true,
        },
      });
    }

    // Find or create Patient record
    let patient = user.patient || await tx.patient.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { phone: data.phone },
          ...(last10Digits ? [{ phone: { contains: last10Digits } }] : []),
        ],
        isDeleted: false,
      },
    });

    if (!patient) {
      const currentYear = new Date().getFullYear();
      const patientCount = await tx.patient.count();
      const patientId = `PAT-${currentYear}-${(patientCount + 1).toString().padStart(4, "0")}`;

      patient = await tx.patient.create({
        data: {
          patientId,
          userId: user.id,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || user.email || null,
          age: data.age || null,
          gender: data.gender || user.gender || Gender.MALE,
        },
      });
    } else if (!patient.userId) {
      patient = await tx.patient.update({
        where: { id: patient.id },
        data: { userId: user.id },
      });
    }

    // Find Doctor Admin
    const doctor = await tx.user.findFirst({
      where: {
        role: UserRole.ADMIN,
        isDeleted: false,
      },
    });

    // Determine fee (support 0 for free bookings!)
    let fee = 0;
    if (data.serviceId) {
      const service = await tx.service.findUnique({ where: { id: data.serviceId } });
      if (service) {
        fee = service.price; // Can be 0 for free booking
      }
    } else if (data.fee !== undefined) {
      fee = Number(data.fee);
    }

    const appointmentRef = `APT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Video meeting link if video consultation
    let videoMeetingLink: string | undefined = undefined;
    let videoProviderName: string | undefined = undefined;

    if (data.consultationType === "VIDEO") {
      const videoProvider = getVideoProvider();
      const meeting = await videoProvider.createMeeting(appointmentRef, envVars.BRAND_NAME);
      videoMeetingLink = meeting.meetingLink;
      videoProviderName = meeting.provider;
    }

    // Create Appointment
    const appointment = await tx.appointment.create({
      data: {
        appointmentRef,
        patientId: patient.id,
        doctorId: doctor?.id || null,
        chamberLocationId: data.chamberLocationId,
        serviceId: data.serviceId || null,
        bookingMode: location.bookingMode,
        appointmentDate: targetDate,
        startTime: data.startTime || null,
        endTime: computedEndTimeStr || null,
        serialNumber: serialNumber || null,
        consultationType: data.consultationType || "IN_PERSON",
        status: AppointmentStatus.CONFIRMED,
        bookingSource: data.bookingSource || "WEBSITE",
        reasonForVisit: data.reasonForVisit || null,
        symptoms: data.symptoms || [],
        preVisitIntake: data.preVisitIntake || null,
        patientName: data.fullName,
        patientPhone: data.phone,
        patientEmail: data.email || user.email || null,
        whatsappNumber: data.whatsappNumber || data.phone || null,
        fee,
        isPaid: fee === 0, // Free bookings are marked paid automatically
        paymentStatus: fee === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
        videoMeetingLink: videoMeetingLink || null,
        videoProvider: videoProviderName || null,
      },
      include: {
        patient: true,
        chamberLocation: true,
        service: true,
        doctor: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Create Queue Token with sequential token numbering
    const queueNumber = serialNumber;
    await tx.queueToken.create({
      data: {
        appointmentId: appointment.id,
        chamberLocationId: data.chamberLocationId,
        date: targetDate,
        tokenNumber: queueNumber,
        estimatedCallTime: data.startTime || null,
      },
    });

    // Create status history
    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        status: AppointmentStatus.CONFIRMED,
        note: `Booked via ${data.bookingSource || "Website"} (Fee: ${fee === 0 ? "Free" : `৳${fee}`})`,
      },
    });

    // Send async confirmation SMS
    const sms = getSmsProvider();
    const smsMsg = `Confirmed: Appointment with ${envVars.BRAND_NAME} on ${data.appointmentDate}${data.startTime ? ` at ${data.startTime}` : ` (Token #${serialNumber})`}. Ref: ${appointmentRef}. Chamber: ${location.name}.`;
    sms.sendSms(patient.phone, smsMsg).catch(() => {});

    // Send async confirmation Email if patient provided email
    const recipientEmail = patient.email || data.email;
    if (recipientEmail) {
      const emailProvider = getEmailProvider();
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #1673b8; margin-top: 0; font-size: 22px;">Appointment Confirmed!</h2>
          <p style="font-size: 15px; color: #1e293b;">Dear <strong>${patient.fullName}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">Your consultation appointment has been officially confirmed in the doctor's schedule. Details are below:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Booking Reference:</td>
              <td style="padding: 10px 0; font-weight: bold; font-family: monospace; color: #0f172a;">${appointmentRef}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Queue Serial Token:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #1673b8; font-size: 16px;">Token #${serialNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Chamber Location:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${location.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Date & Time:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${data.appointmentDate}${data.startTime ? ` at ${data.startTime}` : ""}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Consultation Fee:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${fee === 0 ? "FREE (৳0)" : `৳${fee}`}</td>
            </tr>
          </table>

          <div style="background: #f8fafc; border-left: 4px solid #1673b8; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
            <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 4px;">Important Instructions:</strong>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
              <li>Please arrive 10 minutes before your consultation slot.</li>
              <li>Bring your previous medical reports and prescription history if any.</li>
              <li>You can view or manage your appointments anytime from your patient dashboard.</li>
            </ul>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-bottom: 0;">
            ${envVars.BRAND_NAME} &bull; Automated Patient Notification System
          </p>
        </div>
      `;
      emailProvider.sendEmail(recipientEmail, `Appointment Confirmed - Token #${serialNumber} (Ref: ${appointmentRef})`, emailHtml).catch((e) => {
        console.warn("Async appointment email sending failed:", e?.message);
      });
    }

    return appointment;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });
};

// 3. Walk-In Registration by Doctor / Reception
const createWalkIn = async (data: any, staffId?: string) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return await prisma.$transaction(async (tx) => {
    let patient = await tx.patient.findFirst({
      where: { phone: data.phone, isDeleted: false },
    });

    if (!patient) {
      const currentYear = new Date().getFullYear();
      const count = await tx.patient.count();
      patient = await tx.patient.create({
        data: {
          patientId: `PAT-${currentYear}-${(count + 1).toString().padStart(4, "0")}`,
          fullName: data.fullName,
          phone: data.phone,
          age: data.age || null,
          gender: data.gender || Gender.MALE,
        },
      });
    }

    const location = await tx.chamberLocation.findUnique({
      where: { id: data.chamberLocationId },
    });

    const tokenCount = await tx.queueToken.count({
      where: { chamberLocationId: data.chamberLocationId, date: today },
    });
    const tokenNumber = tokenCount + 1;

    const appointmentRef = `WLK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const fee = data.fee !== undefined ? Number(data.fee) : 1000;

    const appointment = await tx.appointment.create({
      data: {
        appointmentRef,
        patientId: patient.id,
        chamberLocationId: data.chamberLocationId,
        serviceId: data.serviceId || null,
        bookingMode: location?.bookingMode || AppointmentBookingMode.SERIAL_TOKEN,
        appointmentDate: today,
        serialNumber: tokenNumber,
        status: AppointmentStatus.CHECKED_IN,
        bookingSource: "WALK_IN",
        isEmergency: data.isEmergency || false,
        priority: data.isEmergency ? 10 : data.priority || 0,
        checkedInAt: new Date(),
        patientName: data.fullName,
        patientPhone: data.phone,
        fee,
        isPaid: Boolean(data.isPaid),
        paymentStatus: data.isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
      },
      include: {
        patient: true,
        chamberLocation: true,
      },
    });

    await tx.queueToken.create({
      data: {
        appointmentId: appointment.id,
        chamberLocationId: data.chamberLocationId,
        date: today,
        tokenNumber,
      },
    });

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        status: AppointmentStatus.CHECKED_IN,
        note: "Walk-in patient registered and placed in queue",
        changedById: staffId || null,
      },
    });

    return appointment;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });
};

// 4. Patient cancels appointment (Policy: NO REFUND, slot becomes free immediately if time has not passed)
const cancelAppointmentByPatient = async (
  appointmentId: string,
  userId: string,
  reason?: string,
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });

  if (!appointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment not found.");
  }

  // Ensure appointment belongs to requesting patient
  if (appointment.patient.userId !== userId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You are not authorized to cancel this appointment.");
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Appointment is already cancelled.");
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Completed appointments cannot be cancelled.");
  }

  // Update status: CANCELLED, cancelledBy: PATIENT, isRefunded: false (Non-refundable policy)
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledBy: "PATIENT",
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelled by patient",
      isRefunded: false,
      refundAmount: 0,
    },
    include: {
      chamberLocation: true,
      service: true,
      patient: true,
    },
  });

  await prisma.appointmentStatusHistory.create({
    data: {
      appointmentId,
      status: AppointmentStatus.CANCELLED,
      note: `Cancelled by patient: ${reason || "No reason specified"}. (Non-refundable per clinic policy)`,
      changedById: userId,
    },
  });

  return updated;
};

// 5. Doctor cancels appointment (Doctor can decide whether to refund or not)
const cancelAppointmentByDoctor = async (
  appointmentId: string,
  doctorId: string,
  reason?: string,
  refund: boolean = false,
  refundAmount?: number,
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment not found.");
  }

  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Appointment is already cancelled.");
  }

  const effectiveRefundAmount = refund ? (refundAmount || appointment.fee) : 0;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledBy: "DOCTOR",
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelled by doctor",
      isRefunded: refund,
      refundAmount: effectiveRefundAmount,
      refundReason: refund ? (reason || "Refund issued upon doctor cancellation") : null,
      refundedAt: refund ? new Date() : null,
      paymentStatus: refund ? PaymentStatus.REFUNDED : appointment.paymentStatus,
    },
    include: {
      chamberLocation: true,
      service: true,
      patient: true,
    },
  });

  await prisma.appointmentStatusHistory.create({
    data: {
      appointmentId,
      status: AppointmentStatus.CANCELLED,
      note: `Cancelled by doctor: ${reason || "Chamber schedule change"}.${refund ? ` Refund issued: ৳${effectiveRefundAmount}` : " No refund."}`,
      changedById: doctorId,
    },
  });

  return updated;
};

// 6. Doctor explicitly issues a refund for an appointment
const refundAppointment = async (
  appointmentId: string,
  doctorId: string,
  amount?: number,
  reason?: string,
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment not found.");
  }

  const refundAmt = amount !== undefined ? amount : appointment.fee;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      isRefunded: true,
      refundAmount: refundAmt,
      refundReason: reason || "Refund processed by doctor",
      refundedAt: new Date(),
      paymentStatus: PaymentStatus.REFUNDED,
    },
    include: {
      patient: true,
      chamberLocation: true,
    },
  });

  await prisma.appointmentStatusHistory.create({
    data: {
      appointmentId,
      status: appointment.status,
      note: `Refund of ৳${refundAmt} issued by doctor. Reason: ${reason || "Administrative refund"}`,
      changedById: doctorId,
    },
  });

  return updated;
};

// 7. Get logged-in patient's appointments
const getMyAppointments = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patient: true },
  });

  if (!user) {
    return [];
  }

  // Find all patient records connected to this user:
  // 1. By direct userId link
  // 2. By matching email
  // 3. By matching phone number (full or last 10 digits)
  const cleanPhone = user.phoneNumber ? user.phoneNumber.replace(/[^0-9]/g, "") : "";
  const last10Digits = cleanPhone && cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  const matchingPatients = await prisma.patient.findMany({
    where: {
      isDeleted: false,
      OR: [
        { userId: user.id },
        ...(user.email ? [{ email: { equals: user.email, mode: "insensitive" as const } }] : []),
        ...(user.phoneNumber ? [{ phone: user.phoneNumber }] : []),
        ...(last10Digits ? [{ phone: { contains: last10Digits } }] : []),
      ],
    },
    select: { id: true, userId: true },
  });

  // Automatically link any matching unlinked patient records to this user
  const unlinked = matchingPatients.filter((p) => !p.userId);
  if (unlinked.length > 0) {
    await prisma.patient
      .updateMany({
        where: { id: { in: unlinked.map((p) => p.id) } },
        data: { userId: user.id },
      })
      .catch(() => {});
  }

  const patientIds = Array.from(
    new Set([
      ...(user.patient?.id ? [user.patient.id] : []),
      ...matchingPatients.map((p) => p.id),
    ])
  );

  if (patientIds.length === 0) {
    return [];
  }

  return await prisma.appointment.findMany({
    where: {
      patientId: { in: patientIds },
    },
    orderBy: { appointmentDate: "desc" },
    include: {
      chamberLocation: true,
      service: true,
      doctor: {
        select: { id: true, fullName: true, profilePhoto: true },
      },
      queueToken: true,
    },
  });
};

// 8. Live Queue for Chamber Today
const getLiveQueue = async (chamberLocationId: string) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      chamberLocationId,
      appointmentDate: today,
      status: {
        in: [
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_CONSULTATION,
          AppointmentStatus.CONFIRMED,
        ],
      },
    },
    include: {
      patient: true,
      queueToken: true,
      service: true,
    },
    orderBy: [{ priority: "desc" }, { serialNumber: "asc" }, { startTime: "asc" }],
  });

  const nowServing = appointments.find((a) => a.status === AppointmentStatus.IN_CONSULTATION);
  const waitingList = appointments.filter((a) => a.status === AppointmentStatus.CHECKED_IN);
  const upcomingToday = appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED);

  return {
    chamberLocationId,
    date: today.toISOString().split("T")[0],
    nowServing: nowServing
      ? {
          appointmentId: nowServing.id,
          appointmentRef: nowServing.appointmentRef,
          patientName: nowServing.patient.fullName,
          tokenNumber: nowServing.serialNumber || nowServing.queueToken?.tokenNumber,
          consultationStartedAt: nowServing.consultationStartedAt,
        }
      : null,
    waitingCount: waitingList.length,
    waitingList: waitingList.map((a, idx) => ({
      appointmentId: a.id,
      appointmentRef: a.appointmentRef,
      patientName: a.patient.fullName,
      phone: a.patient.phone,
      tokenNumber: a.serialNumber || a.queueToken?.tokenNumber,
      priority: a.priority,
      isEmergency: a.isEmergency,
      checkedInAt: a.checkedInAt,
      estimatedWaitMinutes: idx * 15,
    })),
    upcomingTodayCount: upcomingToday.length,
  };
};

// 9. Update Appointment Status
const updateStatus = async (
  appointmentId: string,
  status: AppointmentStatus,
  changedById?: string,
  note?: string,
  cancelReason?: string,
) => {
  const current = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!current) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment not found.");
  }

  const updateData: any = { status };

  if (status === AppointmentStatus.CHECKED_IN) {
    updateData.checkedInAt = new Date();
  } else if (status === AppointmentStatus.IN_CONSULTATION) {
    updateData.consultationStartedAt = new Date();
  } else if (status === AppointmentStatus.COMPLETED) {
    updateData.consultationEndedAt = new Date();
  } else if (status === AppointmentStatus.CANCELLED) {
    updateData.cancelledAt = new Date();
    updateData.cancelledBy = changedById || "DOCTOR";
    updateData.cancelReason = cancelReason || note || "Cancelled";
  }

  const statusHistoryData: any = {
    appointmentId,
    status,
  };
  if (note) statusHistoryData.note = note;
  if (changedById) statusHistoryData.changedById = changedById;

  const [updated] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        patient: true,
        chamberLocation: true,
        service: true,
      },
    }),
    prisma.appointmentStatusHistory.create({
      data: statusHistoryData,
    }),
  ]);

  return updated;
};

// 10. Get All Appointments (Advanced Data Table with filtering, searching, sorting, pagination)
const getAllAppointments = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const {
    searchTerm,
    status,
    chamberLocationId,
    serviceId,
    startDate,
    endDate,
    date,
    isEmergency,
    paymentStatus,
  } = params;

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { appointmentRef: { contains: searchTerm, mode: "insensitive" } },
        { patientName: { contains: searchTerm, mode: "insensitive" } },
        { patientPhone: { contains: searchTerm, mode: "insensitive" } },
        { patientEmail: { contains: searchTerm, mode: "insensitive" } },
        { patient: { fullName: { contains: searchTerm, mode: "insensitive" } } },
        { patient: { phone: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  if (status && status !== "ALL") {
    andConditions.push({ status });
  }

  if (chamberLocationId && chamberLocationId !== "ALL") {
    andConditions.push({ chamberLocationId });
  }

  if (serviceId && serviceId !== "ALL") {
    andConditions.push({ serviceId });
  }

  if (date) {
    andConditions.push({
      appointmentDate: new Date(`${date}T00:00:00.000Z`),
    });
  }

  if (startDate) {
    andConditions.push({
      appointmentDate: { gte: new Date(`${startDate}T00:00:00.000Z`) },
    });
  }

  if (endDate) {
    andConditions.push({
      appointmentDate: { lte: new Date(`${endDate}T23:59:59.999Z`) },
    });
  }

  if (isEmergency !== undefined && isEmergency !== "") {
    andConditions.push({ isEmergency: isEmergency === "true" || isEmergency === true });
  }

  if (paymentStatus && paymentStatus !== "ALL") {
    andConditions.push({ paymentStatus });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, data] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { appointmentDate: "desc" },
      include: {
        patient: true,
        chamberLocation: true,
        service: true,
        queueToken: true,
      },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit) || 1,
    },
    data,
  };
};

export const AppointmentServices = {
  getAvailability,
  bookAppointment,
  createWalkIn,
  cancelAppointmentByPatient,
  cancelAppointmentByDoctor,
  refundAppointment,
  getMyAppointments,
  getLiveQueue,
  updateStatus,
  getAllAppointments,
};
