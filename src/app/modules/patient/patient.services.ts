import { prisma } from "../../../lib/prisma.js";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import calculatePagination, { type IOptions } from "../../utils/paginations.js";

// 1. Get All Patients (for ManagementTable)
const getAllPatients = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, gender, bloodGroup } = params;

  const andConditions: any[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { patientId: { contains: searchTerm, mode: "insensitive" } },
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (gender && gender !== "ALL") {
    andConditions.push({ gender });
  }

  if (bloodGroup && bloodGroup !== "ALL") {
    andConditions.push({ bloodGroup });
  }

  const where = { AND: andConditions };

  const [total, data] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        appointments: {
          orderBy: { appointmentDate: "desc" },
          take: 1,
        },
        _count: {
          select: {
            appointments: true,
            prescriptions: true,
            invoices: true,
          },
        },
      },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

// 2. Register Patient
const createPatient = async (data: any) => {
  const currentYear = new Date().getFullYear();
  const count = await prisma.patient.count();
  const patientId = `PAT-${currentYear}-${(count + 1).toString().padStart(4, "0")}`;

  return await prisma.patient.create({
    data: {
      ...data,
      patientId,
    },
  });
};

// 3. Get Patient Full Profile with Chronological Timeline
const getPatientById = async (id: string) => {
  const patient = await prisma.patient.findUnique({
    where: { id, isDeleted: false },
    include: {
      appointments: {
        orderBy: { appointmentDate: "desc" },
        include: {
          chamberLocation: true,
          service: true,
        },
      },
      vitals: {
        orderBy: { recordedAt: "desc" },
      },
      visitNotes: {
        orderBy: { createdAt: "desc" },
      },
      prescriptions: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: {
          payments: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      relationsFrom: {
        include: {
          relatedPatient: true,
        },
      },
      relationsTo: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!patient) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient not found.");
  }

  // Build unified chronological timeline
  const timeline: { type: string; date: Date; title: string; summary?: string; id: string }[] = [];

  patient.appointments.forEach((a) => {
    timeline.push({
      type: "APPOINTMENT",
      date: a.appointmentDate,
      title: `Appointment (${a.consultationType}): ${a.chamberLocation.name}`,
      summary: `Status: ${a.status} | Ref: ${a.appointmentRef}`,
      id: a.id,
    });
  });

  patient.prescriptions.forEach((p) => {
    timeline.push({
      type: "PRESCRIPTION",
      date: p.createdAt,
      title: `Prescription #${p.prescriptionNumber}`,
      summary: `${p.items.length} medications prescribed. Diagnoses: ${p.diagnoses.join(", ") || "General"}`,
      id: p.id,
    });
  });

  patient.invoices.forEach((inv) => {
    timeline.push({
      type: "INVOICE",
      date: inv.createdAt,
      title: `Invoice #${inv.invoiceNumber}`,
      summary: `Total: ৳${(inv.total / 100).toFixed(2)} | Status: ${inv.status}`,
      id: inv.id,
    });
  });

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    patient,
    timeline,
  };
};

// 4. Record Vitals with Auto BMI calculation
const recordVitals = async (patientId: string, data: any) => {
  let bmi: number | undefined = undefined;
  if (data.weight && data.height) {
    const heightInMeters = data.height / 100;
    bmi = Number((data.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }

  return await prisma.vital.create({
    data: {
      patientId,
      appointmentId: data.appointmentId || null,
      bpSystolic: data.bpSystolic || null,
      bpDiastolic: data.bpDiastolic || null,
      pulse: data.pulse || null,
      temperature: data.temperature || null,
      weight: data.weight || null,
      height: data.height || null,
      bmi: bmi || null,
      bloodSugar: data.bloodSugar || null,
      spO2: data.spO2 || null,
      notes: data.notes || null,
    },
  });
};

// 5. Get Vitals Trends for Recharts
const getVitalsTrends = async (patientId: string) => {
  return await prisma.vital.findMany({
    where: { patientId },
    orderBy: { recordedAt: "asc" },
    take: 30,
  });
};

export const PatientServices = {
  getAllPatients,
  createPatient,
  getPatientById,
  recordVitals,
  getVitalsTrends,
};
