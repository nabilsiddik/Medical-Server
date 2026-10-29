import { z } from "zod";
import { Gender, UserRole, UserStatus } from "../../../generated/prisma/enums.js";

// User / Patient registration validation schema
const createUserValidationSchema = z.object({
  fullName: z
    .string({ message: "Full name is required" })
    .min(1, "Full name is required"),
  email: z
    .string({ message: "Email is required" })
    .email("Invalid email format"),
  password: z
    .string({ message: "Password is required" })
    .min(6, "Password must be at least 6 characters long"),
  gender: z.nativeEnum(Gender, {
    message: "Gender is required (MALE, FEMALE, OTHER)",
  }),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  age: z.coerce.number().optional(),
  bloodGroup: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

// Update profile validation schema
const updateProfileValidationSchema = z
  .object({
    fullName: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.string().optional(),
    age: z.coerce.number().optional(),
    bloodGroup: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    chronicConditions: z.array(z.string()).optional(),
  })
  .strict();

// Update user status schema (Admin)
const updateStatusValidationSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    message: "Status is required",
  }),
});

// Update user role schema (Admin)
const updateRoleValidationSchema = z.object({
  role: z.nativeEnum(UserRole, {
    message: "Role is required",
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateProfileValidationSchema,
  updateStatusValidationSchema,
  updateRoleValidationSchema,
};
