import { prisma } from "../../../lib/prisma.js";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import calculatePagination, { type IOptions } from "../../utils/paginations.js";
import { generatePrescriptionPdf } from "../../utils/pdfGenerator.js";
import { getOrCreateClinicSettings } from "../clinic/clinic.services.js";

// 1. Search Drug Database for Autocomplete
const searchDrugs = async (query?: string) => {
  if (!query || query.trim().length === 0) {
    return await prisma.drug.findMany({
      where: { isActive: true },
      take: 20,
      orderBy: { brandName: "asc" },
    });
  }

  const cleanQuery = query.trim();
  return await prisma.drug.findMany({
    where: {
      isActive: true,
      OR: [
        { brandName: { contains: cleanQuery, mode: "insensitive" } },
        { genericName: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    take: 25,
    orderBy: { brandName: "asc" },
  });
};

// 2. Add New Drug
const createDrug = async (data: any) => {
  return await prisma.drug.create({
    data,
  });
};

// 3. Create Prescription with Versioning, QR Verification, and Allergy Warnings
const createPrescription = async (doctorId: string, data: any) => {
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
  });

  if (!patient) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient not found.");
  }

  // Allergy warning check against patient allergies
  const allergyWarnings: string[] = [];
  if (patient.allergies && patient.allergies.length > 0) {
    patient.allergies.forEach((allergy) => {
      data.items.forEach((item: any) => {
        if (
          item.drugName.toLowerCase().includes(allergy.toLowerCase()) ||
          item.genericName?.toLowerCase().includes(allergy.toLowerCase())
        ) {
          allergyWarnings.push(
            `Warning: Patient has documented allergy to "${allergy}" which may cross-react with prescribed medication "${item.drugName}".`,
          );
        }
      });
    });
  }

  const currentYear = new Date().getFullYear();
  const count = await prisma.prescription.count();
  const prescriptionNumber = `RX-${currentYear}-${(count + 1).toString().padStart(4, "0")}`;
  const verificationToken = crypto.randomBytes(16).toString("hex");

  return await prisma.$transaction(
    async (tx) => {
      const prescription = await tx.prescription.create({
      data: {
        prescriptionNumber,
        patientId: data.patientId,
        doctorId,
        visitNoteId: data.visitNoteId || null,
        status: "FINALIZED",
        chiefComplaints: data.chiefComplaints || [],
        diagnoses: data.diagnoses || [],
        investigationsAdvised: data.investigationsAdvised || [],
        adviceBangla: data.adviceBangla || null,
        adviceEnglish: data.adviceEnglish || null,
        nextFollowUpDate: data.nextFollowUpDate
          ? new Date(data.nextFollowUpDate)
          : null,
        verificationToken,
        version: 1,
        items: {
          create: data.items.map((item: any, idx: number) => ({
            drugId: item.drugId || null,
            drugName: item.drugName,
            genericName: item.genericName || null,
            form: item.form || "Tablet",
            strength: item.strength || null,
            dose: item.dose,
            frequency: item.frequency,
            duration: item.duration,
            instruction: item.instruction,
            route: item.route || "Oral",
            displayOrder: idx + 1,
          })),
        },
      },
      include: {
        items: true,
        patient: true,
        doctor: true,
      },
    });

    // Create immutable version 1 snapshot
    await tx.prescriptionVersion.create({
      data: {
        prescriptionId: prescription.id,
        version: 1,
        snapshot: prescription as any,
        reasonForChange: "Initial prescription creation",
      },
    });

    return {
      prescription,
      allergyWarnings,
    };
  }, { maxWait: 15000, timeout: 30000 });
};

// 4. Get Prescription Details
const getPrescriptionById = async (id: string) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
      },
      patient: true,
      doctor: true,
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (!prescription) {
    throw new AppError(StatusCodes.NOT_FOUND, "Prescription not found.");
  }

  return prescription;
};

// 5. Generate Prescription PDF Buffer
const getPrescriptionPdfBuffer = async (id: string): Promise<Buffer> => {
  const prescription = await getPrescriptionById(id);
  const settings = await getOrCreateClinicSettings();

  const pdfData = {
    prescriptionNumber: prescription.prescriptionNumber,
    verificationToken: prescription.verificationToken,
    date: prescription.createdAt.toLocaleDateString("en-GB"),
    doctor: {
      name: prescription.doctor.fullName || settings.doctorName,
      title: settings.doctorTitle,
      degrees: settings.degrees,
      bmdcNumber: settings.bmdcNumber,
      phone: settings.phone,
      email: settings.email,
    },
    clinic: {
      name: settings.brandName,
      address: settings.address || "Medical Practice Chamber",
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
    },
    patient: {
      patientId: prescription.patient.patientId,
      fullName: prescription.patient.fullName,
      age: prescription.patient.age !== null && prescription.patient.age !== undefined ? prescription.patient.age : "N/A",
      gender: prescription.patient.gender || "N/A",
      phone: prescription.patient.phone,
    },
    chiefComplaints: prescription.chiefComplaints,
    diagnoses: prescription.diagnoses,
    investigations: prescription.investigationsAdvised,
    items: prescription.items.map((i) => ({
      form: i.form,
      name: i.drugName,
      strength: i.strength || undefined,
      dose: i.dose,
      frequency: i.frequency,
      duration: i.duration,
      instruction: i.instruction,
    })),
    adviceBangla: prescription.adviceBangla || undefined,
    adviceEnglish: prescription.adviceEnglish || undefined,
    nextFollowUpDate: prescription.nextFollowUpDate
      ? prescription.nextFollowUpDate.toLocaleDateString("en-GB")
      : undefined,
  };

  return await generatePrescriptionPdf(pdfData);
};

// 6. Public QR Code Authenticity Verification
const verifyPrescription = async (token: string) => {
  const prescription = await prisma.prescription.findUnique({
    where: { verificationToken: token },
    include: {
      patient: true,
      doctor: true,
      items: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!prescription) {
    return {
      isValid: false,
      message: "Invalid or forged verification code. No authentic medical record found.",
    };
  }

  const settings = await getOrCreateClinicSettings();

  // Obfuscate patient name for privacy (e.g. "R**** A****")
  const obfuscate = (name: string) =>
    name
      .split(" ")
      .map((part) => (part.length > 1 ? `${part[0]}${"*".repeat(part.length - 1)}` : part))
      .join(" ");

  return {
    isValid: true,
    id: prescription.id,
    prescriptionNumber: prescription.prescriptionNumber,
    createdAt: prescription.createdAt,
    issuedDate: prescription.createdAt.toLocaleDateString("en-GB"),
    doctor: {
      fullName: prescription.doctor.fullName || settings.doctorName,
      name: prescription.doctor.fullName || settings.doctorName,
      title: settings.doctorTitle,
      bmdcNumber: settings.bmdcNumber,
    },
    clinic: {
      name: settings.brandName,
      phone: settings.phone,
    },
    patient: {
      fullName: obfuscate(prescription.patient.fullName),
      initials: obfuscate(prescription.patient.fullName),
      patientId: prescription.patient.patientId,
    },
    patientId: prescription.patient.patientId,
    items: prescription.items,
    status: prescription.status,
    message: "Verified authentic medical prescription issued by registered practitioner.",
  };
};

// 7. Get All Prescriptions (for ManagementTable)
const getAllPrescriptions = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, patientId } = params;

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { prescriptionNumber: { contains: searchTerm, mode: "insensitive" } },
        { patient: { fullName: { contains: searchTerm, mode: "insensitive" } } },
        { patient: { phone: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  if (patientId) {
    andConditions.push({ patientId });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, data] = await Promise.all([
    prisma.prescription.count({ where }),
    prisma.prescription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        patient: true,
        doctor: true,
        items: true,
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

// 8. Get Patient Prescriptions
const getMyPrescriptions = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
  const unlinkedPatientIds = matchingPatients
    .filter((p) => !p.userId)
    .map((p) => p.id);

  if (unlinkedPatientIds.length > 0) {
    await prisma.patient
      .updateMany({
        where: { id: { in: unlinkedPatientIds } },
        data: { userId: user.id },
      })
      .catch(() => {});
  }

  const patientIds = matchingPatients.map((p) => p.id);
  if (patientIds.length === 0) {
    return [];
  }

  return await prisma.prescription.findMany({
    where: {
      patientId: { in: patientIds },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
      },
      doctor: {
        select: { fullName: true, profilePhoto: true, email: true },
      },
      patient: {
        select: {
          id: true,
          patientId: true,
          fullName: true,
          phone: true,
          email: true,
          gender: true,
          age: true,
          bloodGroup: true,
        },
      },
    },
  });
};

export const PrescriptionServices = {
  searchDrugs,
  createDrug,
  createPrescription,
  getPrescriptionById,
  getPrescriptionPdfBuffer,
  verifyPrescription,
  getAllPrescriptions,
  getMyPrescriptions,
};
