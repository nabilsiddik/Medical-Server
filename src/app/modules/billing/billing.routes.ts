import { Router } from "express";
import { BillingControllers } from "./billing.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  createInvoiceSchema,
  recordPaymentSchema,
  createExpenseSchema,
} from "./billing.validations.js";

const billingRouter = Router();

// Doctor Admin: Invoices data table
billingRouter.get(
  "/invoices",
  checkAuth(UserRole.ADMIN),
  BillingControllers.getAllInvoices,
);

// Doctor Admin: Create invoice
billingRouter.post(
  "/invoices",
  checkAuth(UserRole.ADMIN),
  validateRequest(createInvoiceSchema),
  BillingControllers.createInvoice,
);

// Doctor Admin: Record payment
billingRouter.post(
  "/invoices/:id/payment",
  checkAuth(UserRole.ADMIN),
  validateRequest(recordPaymentSchema),
  BillingControllers.recordPayment,
);
billingRouter.post(
  "/invoices/:id/payments",
  checkAuth(UserRole.ADMIN),
  validateRequest(recordPaymentSchema),
  BillingControllers.recordPayment,
);

// Doctor Admin / Patient: Download branded invoice PDF
billingRouter.get(
  "/invoices/:id/pdf",
  checkAuth(...Object.values(UserRole)),
  BillingControllers.downloadInvoicePdf,
);

// Doctor Admin: Daily cash-up report
billingRouter.get(
  "/daily-cash-up",
  checkAuth(UserRole.ADMIN),
  BillingControllers.getDailyCashUp,
);

// Doctor Admin: Expense tracking
billingRouter.post(
  "/expenses",
  checkAuth(UserRole.ADMIN),
  validateRequest(createExpenseSchema),
  BillingControllers.createExpense,
);

billingRouter.get(
  "/expenses",
  checkAuth(UserRole.ADMIN),
  BillingControllers.getExpenses,
);

// Doctor Admin: Profit overview
billingRouter.get(
  "/profit-overview",
  checkAuth(UserRole.ADMIN),
  BillingControllers.getProfitOverview,
);

export default billingRouter;
