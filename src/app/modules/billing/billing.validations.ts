import { z } from "zod";

export const createInvoiceSchema = z.object({
  body: z.object({
    patientId: z.string().uuid("Invalid patient ID"),
    appointmentId: z.string().uuid().optional(),
    discount: z.number().int().min(0).default(0),
    tax: z.number().int().min(0).default(0),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          serviceId: z.string().uuid().optional(),
          description: z.string().min(1, "Item description is required"),
          unitPrice: z.number().int().min(0, "Unit price must be non-negative"),
          quantity: z.number().int().min(1).default(1),
        }),
      )
      .min(1, "At least one item is required"),
  }),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    amount: z.number().int().positive("Payment amount must be positive"),
    method: z.enum([
      "CASH",
      "CARD_ON_SITE",
      "BANK_TRANSFER",
      "BKASH",
      "NAGAD",
      "ROCKET",
      "STRIPE",
      "PAYPAL",
    ]).default("CASH"),
    transactionId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(2, "Category is required"),
    amount: z.number().int().positive("Expense amount must be positive"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    description: z.string().optional(),
  }),
});
