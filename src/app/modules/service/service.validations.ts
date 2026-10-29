import { z } from "zod";

export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Service name is required"),
    slug: z.string().min(2, "Slug is required"),
    description: z.string().optional(),
    whoIsItFor: z.string().optional(),
    procedureSteps: z.array(z.string()).optional(),
    durationMinutes: z.number().int().min(5).default(15),
    price: z.number().int().min(0).default(100000), // in minor units
    followUpPrice: z.number().int().min(0).default(50000),
    consultationType: z.enum(["IN_PERSON", "VIDEO", "FOLLOW_UP", "HOME_VISIT"]).default("IN_PERSON"),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(true),
    displayOrder: z.number().int().default(1),
  }),
});

export const updateServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    whoIsItFor: z.string().optional(),
    procedureSteps: z.array(z.string()).optional(),
    durationMinutes: z.number().int().min(5).optional(),
    price: z.number().int().min(0).optional(),
    followUpPrice: z.number().int().min(0).optional(),
    consultationType: z.enum(["IN_PERSON", "VIDEO", "FOLLOW_UP", "HOME_VISIT"]).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  }),
});
