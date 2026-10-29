import { z } from "zod";

export const createPatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, "Full name is required"),
    phone: z.string().min(8, "Phone number is required"),
    email: z.string().email().optional(),
    age: z.number().int().min(0).max(120).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHERS"]).optional(),
    bloodGroup: z.string().optional(),
    address: z.string().optional(),
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    chronicConditions: z.array(z.string()).optional(),
    currentMedications: z.array(z.string()).optional(),
    familyHistory: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const recordVitalsSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid().optional(),
    bpSystolic: z.number().int().min(40).max(300).optional(),
    bpDiastolic: z.number().int().min(30).max(200).optional(),
    pulse: z.number().int().min(30).max(250).optional(),
    temperature: z.number().min(90).max(110).optional(), // Fahrenheit
    weight: z.number().min(1).max(400).optional(), // kg
    height: z.number().min(30).max(250).optional(), // cm
    bloodSugar: z.number().min(1).max(50).optional(), // mmol/L
    spO2: z.number().int().min(50).max(100).optional(),
    notes: z.string().optional(),
  }),
});
