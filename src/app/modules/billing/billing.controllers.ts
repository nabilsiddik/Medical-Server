import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { BillingServices } from "./billing.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";
import { pickQueries } from "../../utils/pickQueries.js";

const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingServices.createInvoice(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Invoice created successfully",
    data: result,
  });
});

const recordPayment = catchAsync(async (req: Request, res: Response) => {
  const staffId = req.user?.id;
  const result = await BillingServices.recordPayment(req.params.id as string, req.body, staffId);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Payment recorded successfully",
    data: result,
  });
});

const downloadInvoicePdf = catchAsync(async (req: Request, res: Response) => {
  const pdfBuffer = await BillingServices.getInvoicePdfBuffer(req.params.id as string);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="invoice-${req.params.id}.pdf"`,
  );
  res.send(pdfBuffer);
});

const getDailyCashUp = catchAsync(async (req: Request, res: Response) => {
  const dateStr = req.query.date as string;
  const result = await BillingServices.getDailyCashUp(dateStr);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Daily cash-up collection report",
    data: result,
  });
});

const createExpense = catchAsync(async (req: Request, res: Response) => {
  const staffId = req.user?.id;
  const result = await BillingServices.createExpense(req.body, staffId);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Expense recorded successfully",
    data: result,
  });
});

const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const options = pickQueries(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await BillingServices.getExpenses(options);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Expenses retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getProfitOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await BillingServices.getProfitOverview();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profit & balance overview",
    data: result,
  });
});

const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
  const filters = pickQueries(req.query, ["searchTerm", "status"]);
  const options = pickQueries(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await BillingServices.getAllInvoices(filters, options);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invoices retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const BillingControllers = {
  createInvoice,
  recordPayment,
  downloadInvoicePdf,
  getDailyCashUp,
  createExpense,
  getExpenses,
  getProfitOverview,
  getAllInvoices,
};
