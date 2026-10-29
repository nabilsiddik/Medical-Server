import { z } from "zod";

export const createPrescriptionSchema = z.object({
  body: z
    .object({
      patientId: z.string().uuid("Invalid patient ID"),
      appointmentId: z.string().uuid().optional().nullable(),
      chiefComplaints: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : [val];
        }),
      diagnoses: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : [val];
        }),
      diagnosis: z.string().optional(),
      investigationsAdvised: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
          if (!val) return [];
          return Array.isArray(val) ? val : [val];
        }),
      items: z
        .array(
          z
            .object({
              drugId: z.string().uuid().optional().nullable(),
              drugName: z.string().optional(),
              brandName: z.string().optional(),
              genericName: z.string().optional().nullable(),
              form: z.string().default("Tablet"),
              strength: z.string().optional().nullable(),
              dose: z.string().optional(),
              dosage: z.string().optional(),
              frequency: z.string().optional(),
              duration: z.string().default("5 days"),
              instruction: z.string().default("After meal"),
              route: z.string().default("Oral"),
            })
            .transform((item) => ({
              ...item,
              drugName: item.drugName || item.brandName || "Prescribed Medicine",
              dose: item.dose || item.dosage || "1 tablet",
              frequency: item.frequency || item.dosage || "1+0+1",
            })),
        )
        .min(1, "At least one medication is required"),
      advice: z.string().optional(),
      adviceBangla: z.string().optional(),
      adviceEnglish: z.string().optional(),
      nextFollowUpDate: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (!val || val.trim() === "" ? undefined : val)),
      followUpDate: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (!val || val.trim() === "" ? undefined : val)),
    })
    .transform((body) => {
      const diagnosesList =
        body.diagnoses && body.diagnoses.length > 0
          ? body.diagnoses
          : body.diagnosis
            ? [body.diagnosis]
            : [];
      const adviceText = body.adviceEnglish || body.advice || body.adviceBangla;
      const followUp = body.nextFollowUpDate || body.followUpDate;

      return {
        ...body,
        diagnoses: diagnosesList,
        adviceEnglish: adviceText,
        nextFollowUpDate: followUp,
      };
    }),
});

export const createDrugSchema = z.object({
  body: z.object({
    brandName: z.string().min(1, "Brand name is required"),
    genericName: z.string().min(1, "Generic name is required"),
    form: z.string().default("Tablet"),
    strength: z.string().optional(),
    defaultDose: z.string().optional(),
    defaultFrequency: z.string().optional(),
    defaultDuration: z.string().optional(),
    defaultInstruction: z.string().optional(),
    manufacturer: z.string().optional(),
  }),
});

export const createCertificateSchema = z.object({
  body: z.object({
    patientId: z.string().uuid(),
    type: z.enum(["SICK_LEAVE", "FITNESS", "REFERRAL"]).default("SICK_LEAVE"),
    title: z.string().min(3),
    content: z.string().min(10),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});
