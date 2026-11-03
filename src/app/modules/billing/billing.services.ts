import { prisma } from "../../../lib/prisma.js";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import calculatePagination, { type IOptions } from "../../utils/paginations.js";
import { generateInvoicePdf } from "../../utils/pdfGenerator.js";
import { getOrCreateClinicSettings } from "../clinic/clinic.services.js";
import { PaymentMethod } from "../../../generated/prisma/enums.js";

// 1. Create Invoice
const createInvoice = async (data: any) => {
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
  });

  if (!patient) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient not found.");
  }

  // Calculate items total
  let subtotal = 0;
  const itemsData = data.items.map((item: any) => {
    const itemTotal = item.unitPrice * item.quantity;
    subtotal += itemTotal;
    return {
      serviceId: item.serviceId || null,
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      total: itemTotal,
    };
  });

  const discount = data.discount || 0;
  const tax = data.tax || 0;
  const total = Math.max(0, subtotal - discount + tax);

  const currentYear = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const invoiceNumber = `INV-${currentYear}-${(count + 1).toString().padStart(4, "0")}`;

  return await prisma.invoice.create({
    data: {
      invoiceNumber,
      patientId: data.patientId,
      appointmentId: data.appointmentId || null,
      subtotal,
      discount,
      tax,
      total,
      paidAmount: 0,
      dueAmount: total,
      status: "PENDING",
      notes: data.notes || null,
      items: {
        create: itemsData,
      },
    },
    include: {
      items: true,
      patient: true,
    },
  });
};

// 2. Record Payment for an Invoice
const recordPayment = async (invoiceId: string, data: any, staffId?: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new AppError(StatusCodes.NOT_FOUND, "Invoice not found.");
  }

  const currentYear = new Date().getFullYear();
  const paymentCount = await prisma.payment.count();
  const receiptNumber = `REC-${currentYear}-${(paymentCount + 1).toString().padStart(4, "0")}`;

  const payAmount = Math.round(Number(data.amount));
  const newPaidAmount = invoice.paidAmount + payAmount;
  const newDueAmount = Math.max(0, invoice.total - newPaidAmount);
  const newStatus = newDueAmount === 0 ? "PAID" : "PARTIAL";

  let effectiveMethod: PaymentMethod = PaymentMethod.CASH;
  const rawMethod = String(data.method || "CASH").toUpperCase();
  if (rawMethod === "CARD" || rawMethod === "CARD_ON_SITE") {
    effectiveMethod = PaymentMethod.CARD_ON_SITE;
  } else if (rawMethod === "SSLCOMMERZ" || rawMethod === "ONLINE") {
    effectiveMethod = PaymentMethod.SSLCOMMERZ;
  } else if (rawMethod in PaymentMethod) {
    effectiveMethod = (PaymentMethod as any)[rawMethod];
  }

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        amount: payAmount,
        method: effectiveMethod,
        transactionId: data.transactionId || null,
        collectedById: staffId || null,
        notes: data.notes || null,
        receiptNumber,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newStatus,
      },
      include: {
        items: true,
        patient: true,
        payments: true,
      },
    });

    // If attached to an appointment and fully paid, mark appointment isPaid = true
    if (invoice.appointmentId && newStatus === "PAID") {
      await tx.appointment.update({
        where: { id: invoice.appointmentId },
        data: { isPaid: true },
      });
    }

    return {
      payment,
      invoice: updatedInvoice,
    };
  });
};

// 3. Get Invoice PDF
const getInvoicePdfBuffer = async (id: string): Promise<Buffer> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      patient: true,
    },
  });

  if (!invoice) {
    throw new AppError(StatusCodes.NOT_FOUND, "Invoice not found.");
  }

  const settings = await getOrCreateClinicSettings();

  return await generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.createdAt.toLocaleDateString("en-GB"),
    doctorName: settings.doctorName,
    clinicName: settings.brandName,
    patientName: invoice.patient.fullName,
    patientId: invoice.patient.patientId,
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    total: invoice.total,
    paid: invoice.paidAmount,
    due: invoice.dueAmount,
    currencySymbol: settings.currencySymbol,
    primaryColor: settings.primaryColor,
  });
};

// 4. Daily Cash-Up Collection Report
const getDailyCashUp = async (dateStr?: string) => {
  const targetDate = dateStr
    ? new Date(`${dateStr}T00:00:00.000Z`)
    : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      invoice: {
        include: {
          patient: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byMethod: Record<string, number> = {};
  let totalCollection = 0;

  payments.forEach((p) => {
    byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
    totalCollection += p.amount;
  });

  return {
    date: startOfDay.toISOString().split("T")[0],
    totalCollection,
    totalTransactions: payments.length,
    byMethod,
    payments,
  };
};

// 5. Expense Tracking & Profit Overview
const createExpense = async (data: any, staffId?: string) => {
  return await prisma.expense.create({
    data: {
      category: data.category,
      amount: data.amount,
      date: new Date(`${data.date}T00:00:00.000Z`),
      description: data.description || null,
      recordedById: staffId || null,
    },
  });
};

const getExpenses = async (options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const [total, data] = await Promise.all([
    prisma.expense.count(),
    prisma.expense.findMany({
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data,
  };
};

const getProfitOverview = async () => {
  // Aggregate total revenues and expenses
  const [totalPaid, totalExpenses] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
  ]);

  const revenue = totalPaid._sum.amount || 0;
  const expense = totalExpenses._sum.amount || 0;
  const netProfit = revenue - expense;

  return {
    revenue,
    expense,
    netProfit,
  };
};

// 6. Get All Invoices (for ManagementTable)
const getAllInvoices = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, status } = params;

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { invoiceNumber: { contains: searchTerm, mode: "insensitive" } },
        { patient: { fullName: { contains: searchTerm, mode: "insensitive" } } },
        { patient: { phone: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  if (status && status !== "ALL") {
    andConditions.push({ status });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, data] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        patient: true,
        items: true,
        payments: true,
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

export const BillingServices = {
  createInvoice,
  recordPayment,
  getInvoicePdfBuffer,
  getDailyCashUp,
  createExpense,
  getExpenses,
  getProfitOverview,
  getAllInvoices,
};
