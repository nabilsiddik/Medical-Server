import { prisma } from "../../../lib/prisma.js";
import {
  AppointmentStatus,
  Gender,
  PaymentStatus,
  UserRole,
} from "../../../generated/prisma/enums.js";

// Helper to format date as YYYY-MM-DD
function formatDate(d: Date): string {
  return d.toISOString().split("T")[0] || "";
}

const getDoctorAnalyticsOverview = async () => {
  const now = new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // 1. 4 Primary Stat Cards
  const [
    totalPatients,
    upcomingAppointments,
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    allPaidAppointments,
    allInvoices,
    maleCount,
    femaleCount,
    otherCount,
  ] = await Promise.all([
    // Stat 1: Total Patients
    prisma.patient.count({ where: { isDeleted: false } }),
    // Stat 2: Upcoming Appointments
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: today },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING, AppointmentStatus.CHECKED_IN] },
      },
    }),
    // Total Appointments
    prisma.appointment.count(),
    // Completed Appointments
    prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
    // Cancelled Appointments
    prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED } }),
    // Stat 3: Total Revenue from paid/completed appointments
    prisma.appointment.findMany({
      where: {
        OR: [
          { isPaid: true },
          { status: AppointmentStatus.COMPLETED },
          { paymentStatus: PaymentStatus.PAID },
        ],
        status: { not: AppointmentStatus.CANCELLED },
      },
      select: { fee: true, refundAmount: true, isRefunded: true },
    }),
    // Invoices paid amount
    prisma.invoice.findMany({
      where: { status: PaymentStatus.PAID },
      select: { paidAmount: true },
    }),
    // Gender counts for pie chart
    prisma.patient.count({ where: { isDeleted: false, gender: Gender.MALE } }),
    prisma.patient.count({ where: { isDeleted: false, gender: Gender.FEMALE } }),
    prisma.patient.count({
      where: {
        isDeleted: false,
        OR: [{ gender: Gender.OTHER }, { gender: Gender.OTHERS }],
      },
    }),
  ]);

  // Compute Total Revenue
  const appointmentRevenue = allPaidAppointments.reduce((sum, apt) => {
    const net = apt.isRefunded ? Math.max(0, apt.fee - (apt.refundAmount || 0)) : apt.fee;
    return sum + net;
  }, 0);

  const invoiceRevenue = allInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalRevenue = Math.max(appointmentRevenue, invoiceRevenue);

  // 2. Gender Distribution Pie Chart
  const totalGenderPatients = maleCount + femaleCount + otherCount || 1;
  const genderDistribution = [
    {
      name: "Male",
      gender: "MALE",
      count: maleCount,
      percentage: Number(((maleCount / totalGenderPatients) * 100).toFixed(1)),
      color: "#0284c7", // Sky blue
    },
    {
      name: "Female",
      gender: "FEMALE",
      count: femaleCount,
      percentage: Number(((femaleCount / totalGenderPatients) * 100).toFixed(1)),
      color: "#ec4899", // Pink
    },
    {
      name: "Other",
      gender: "OTHER",
      count: otherCount,
      percentage: Number(((otherCount / totalGenderPatients) * 100).toFixed(1)),
      color: "#8b5cf6", // Purple
    },
  ];

  // 3. Patients Registration By Date (Last 14 days daily trend)
  const daysCount = 14;
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - daysCount + 1);
  pastDate.setUTCHours(0, 0, 0, 0);

  const recentPatients = await prisma.patient.findMany({
    where: {
      isDeleted: false,
      createdAt: { gte: pastDate },
    },
    select: { createdAt: true },
  });

  const patientRegistrationMap = new Map<string, number>();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(pastDate);
    d.setDate(pastDate.getDate() + i);
    patientRegistrationMap.set(formatDate(d), 0);
  }

  recentPatients.forEach((p) => {
    const dStr = formatDate(p.createdAt);
    if (patientRegistrationMap.has(dStr)) {
      patientRegistrationMap.set(dStr, (patientRegistrationMap.get(dStr) || 0) + 1);
    }
  });

  const patientsRegistrationByDate = Array.from(patientRegistrationMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );

  // 4. Appointments By Date (Past 7 days + Next 7 days)
  const windowStart = new Date();
  windowStart.setDate(now.getDate() - 7);
  windowStart.setUTCHours(0, 0, 0, 0);

  const windowEnd = new Date();
  windowEnd.setDate(now.getDate() + 7);
  windowEnd.setUTCHours(23, 59, 59, 999);

  const windowAppointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    select: {
      appointmentDate: true,
      status: true,
      fee: true,
    },
  });

  const appointmentDateMap = new Map<
    string,
    { total: number; confirmed: number; completed: number; cancelled: number }
  >();

  for (let i = -7; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    appointmentDateMap.set(formatDate(d), {
      total: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    });
  }

  windowAppointments.forEach((apt) => {
    const dStr = formatDate(apt.appointmentDate);
    if (appointmentDateMap.has(dStr)) {
      const entry = appointmentDateMap.get(dStr)!;
      entry.total += 1;
      if (apt.status === AppointmentStatus.COMPLETED) entry.completed += 1;
      else if (apt.status === AppointmentStatus.CANCELLED) entry.cancelled += 1;
      else entry.confirmed += 1;
    }
  });

  const appointmentsByDate = Array.from(appointmentDateMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  // 5. Recent Registrations (Last 6 registered patients)
  const recentRegistrations = await prisma.patient.findMany({
    where: { isDeleted: false },
    take: 6,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      patientId: true,
      fullName: true,
      phone: true,
      email: true,
      gender: true,
      age: true,
      bloodGroup: true,
      createdAt: true,
    },
  });

  // 6. Recent Appointments (Last 6 booked/updated appointments)
  const recentAppointments = await prisma.appointment.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      patient: {
        select: { id: true, patientId: true, fullName: true, phone: true },
      },
      chamberLocation: {
        select: { id: true, name: true, city: true },
      },
      service: {
        select: { id: true, name: true, price: true },
      },
    },
  });

  // 7. Chamber breakdown (Appointments and Revenue per chamber)
  const chambers = await prisma.chamberLocation.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true },
  });

  const chamberAnalytics = await Promise.all(
    chambers.map(async (ch) => {
      const [aptCount, paidApts] = await Promise.all([
        prisma.appointment.count({
          where: { chamberLocationId: ch.id },
        }),
        prisma.appointment.findMany({
          where: {
            chamberLocationId: ch.id,
            OR: [
              { isPaid: true },
              { status: AppointmentStatus.COMPLETED },
            ],
            status: { not: AppointmentStatus.CANCELLED },
          },
          select: { fee: true },
        }),
      ]);
      const revenue = paidApts.reduce((sum, a) => sum + a.fee, 0);
      return {
        id: ch.id,
        name: ch.name,
        city: ch.city,
        totalAppointments: aptCount,
        totalRevenue: revenue,
      };
    }),
  );

  return {
    statsCards: {
      totalPatients,
      upcomingAppointments,
      totalRevenue,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
    },
    genderDistribution,
    patientsRegistrationByDate,
    appointmentsByDate,
    recentRegistrations,
    recentAppointments: recentAppointments.map((a) => ({
      id: a.id,
      appointmentRef: a.appointmentRef,
      patientName: a.patientName || a.patient.fullName,
      patientPhone: a.patientPhone || a.patient.phone,
      chamberName: a.chamberLocation.name,
      appointmentDate: a.appointmentDate,
      startTime: a.startTime,
      fee: a.fee,
      status: a.status,
      isPaid: a.isPaid,
      consultationType: a.consultationType,
      createdAt: a.createdAt,
    })),
    chamberAnalytics,
  };
};

export const AnalyticsServices = {
  getDoctorAnalyticsOverview,
};
