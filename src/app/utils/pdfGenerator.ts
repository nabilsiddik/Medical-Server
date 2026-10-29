import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { envVars } from "../config/env.config.js";
import { generateBrandPalette } from "./colorScale.js";

interface PrescriptionPdfData {
  prescriptionNumber: string;
  verificationToken: string;
  date: string;
  doctor: {
    name: string;
    title: string;
    degrees: string;
    bmdcNumber: string;
    phone: string;
    email?: string | undefined;
  };
  clinic: {
    name: string;
    address: string;
    primaryColor?: string | undefined;
    secondaryColor?: string | undefined;
    logoUrl?: string | undefined;
  };
  patient: {
    patientId: string;
    fullName: string;
    age?: number | string | undefined;
    gender?: string | undefined;
    phone?: string | undefined;
  };
  chiefComplaints?: string[] | undefined;
  diagnoses?: string[] | undefined;
  investigations?: string[] | undefined;
  items: {
    form: string;
    name: string;
    strength?: string | undefined;
    dose: string;
    frequency: string;
    duration: string;
    instruction: string;
  }[];
  adviceBangla?: string | undefined;
  adviceEnglish?: string | undefined;
  nextFollowUpDate?: string | undefined;
}

export async function generatePrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  const palette = generateBrandPalette(
    data.clinic.primaryColor || envVars.BRAND_PRIMARY_COLOR,
    data.clinic.secondaryColor || envVars.BRAND_SECONDARY_COLOR,
  );

  // Generate QR Code linking to verification page
  const verificationUrl = `${envVars.CLIENT_URL}/verify-rx/${data.verificationToken}`;
  const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
    width: 90,
    margin: 1,
    color: {
      dark: palette.primary,
      light: "#FFFFFF",
    },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 36, bottom: 36, left: 40, right: 40 },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // 1. Header / Letterhead
    doc.rect(40, 36, 515, 3).fill(palette.primary);

    // Doctor info left
    doc
      .fontSize(16)
      .fillColor(palette.primary)
      .text(data.doctor.name, 40, 48, { bold: true } as any);
    doc
      .fontSize(9)
      .fillColor("#475569")
      .text(`${data.doctor.title} • ${data.doctor.degrees}`);
    doc.text(`BMDC Reg. No: ${data.doctor.bmdcNumber}`);
    doc.text(`Phone: ${data.doctor.phone}`);

    // QR Code top right
    doc.image(qrCodeBuffer, 465, 45, { width: 75, height: 75 });
    doc
      .fontSize(7)
      .fillColor("#64748b")
      .text("Scan to Verify", 475, 122);

    doc.moveDown(1.5);
    doc.rect(40, 135, 515, 1).fill("#cbd5e1");

    // 2. Patient Banner Bar
    doc.rect(40, 142, 515, 26).fill("#f8fafc");
    doc
      .fontSize(9)
      .fillColor("#0f172a")
      .text(
        `Patient: ${data.patient.fullName}  |  Age: ${data.patient.age || "N/A"}  |  Gender: ${data.patient.gender || "N/A"}  |  ID: ${data.patient.patientId}`,
        50,
        150,
      );
    doc.text(`Date: ${data.date}  |  Rx: ${data.prescriptionNumber}`, 360, 150);

    // 3. Clinical Summary (Left column) & Medicines (Right column)
    const startY = 180;

    // Left sidebar: Complaints & Diagnosis
    let leftY = startY;
    if (data.chiefComplaints && data.chiefComplaints.length > 0) {
      doc.fontSize(10).fillColor(palette.secondary).text("Chief Complaints:", 40, leftY);
      leftY += 15;
      data.chiefComplaints.forEach((c) => {
        doc.fontSize(8).fillColor("#334155").text(`• ${c}`, 45, leftY);
        leftY += 12;
      });
      leftY += 8;
    }

    if (data.diagnoses && data.diagnoses.length > 0) {
      doc.fontSize(10).fillColor(palette.secondary).text("Diagnosis:", 40, leftY);
      leftY += 15;
      data.diagnoses.forEach((d) => {
        doc.fontSize(8).fillColor("#334155").text(`• ${d}`, 45, leftY);
        leftY += 12;
      });
      leftY += 8;
    }

    if (data.investigations && data.investigations.length > 0) {
      doc.fontSize(10).fillColor(palette.secondary).text("Investigations:", 40, leftY);
      leftY += 15;
      data.investigations.forEach((inv) => {
        doc.fontSize(8).fillColor("#334155").text(`• ${inv}`, 45, leftY);
        leftY += 12;
      });
    }

    // Divider line between columns
    doc.moveTo(175, startY).lineTo(175, 680).strokeColor("#e2e8f0").stroke();

    // Right column: Rx Medications
    let rightY = startY;
    doc
      .fontSize(18)
      .fillColor(palette.primary)
      .text("℞", 190, rightY - 5);
    rightY += 24;

    data.items.forEach((item, idx) => {
      // Drug line: 1. Tab. Napa Extra (500mg)
      doc
        .fontSize(10)
        .fillColor("#0f172a")
        .text(
          `${idx + 1}.  ${item.form} ${item.name} ${item.strength ? `(${item.strength})` : ""}`,
          195,
          rightY,
        );
      rightY += 14;

      // Dosage & instruction: 1+0+1  --  5 days  --  খাবারের পর
      doc
        .fontSize(8)
        .fillColor("#475569")
        .text(
          `     ${item.dose}  •  ${item.frequency}  •  ${item.duration}  •  ${item.instruction}`,
          195,
          rightY,
        );
      rightY += 18;
    });

    // Advice block
    if (data.adviceEnglish || data.adviceBangla) {
      rightY = Math.max(rightY + 15, 520);
      doc.fontSize(10).fillColor(palette.secondary).text("Advice / নির্দেশনাবলী:", 195, rightY);
      rightY += 14;
      if (data.adviceEnglish) {
        doc.fontSize(8).fillColor("#334155").text(data.adviceEnglish, 205, rightY);
        rightY += 14;
      }
      if (data.adviceBangla) {
        doc.fontSize(8).fillColor("#334155").text(data.adviceBangla, 205, rightY);
        rightY += 14;
      }
    }

    if (data.nextFollowUpDate) {
      rightY += 10;
      doc
        .fontSize(9)
        .fillColor(palette.primary)
        .text(`Next Follow-up: ${data.nextFollowUpDate}`, 195, rightY);
    }

    // 4. Footer & Signature
    doc.rect(40, 750, 515, 2).fill(palette.primary);
    doc
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        `Generated electronically by ${data.clinic.name}. Authentic copy with QR verification.`,
        40,
        760,
      );
    doc.text(`Doctor's Signature: _________________________`, 340, 760);

    doc.end();
  });
}

interface InvoicePdfData {
  invoiceNumber: string;
  date: string;
  doctorName: string;
  clinicName: string;
  patientName: string;
  patientId: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  currencySymbol: string;
  primaryColor?: string;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const palette = generateBrandPalette(
    data.primaryColor || envVars.BRAND_PRIMARY_COLOR,
    envVars.BRAND_SECONDARY_COLOR,
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Header
    doc.rect(40, 40, 515, 4).fill(palette.primary);
    doc.fontSize(20).fillColor(palette.primary).text(data.clinicName, 40, 55);
    doc.fontSize(10).fillColor("#64748b").text(`Doctor: ${data.doctorName}`);
    doc.text(`Invoice Ref: ${data.invoiceNumber}`);
    doc.text(`Date: ${data.date}`);

    doc.moveDown(1.5);
    doc.rect(40, 130, 515, 1).fill("#cbd5e1");

    // Bill to
    doc.fontSize(11).fillColor("#0f172a").text("Billed To:", 40, 145);
    doc.fontSize(9).fillColor("#334155").text(`Patient: ${data.patientName}`);
    doc.text(`Patient ID: ${data.patientId}`);

    // Table Header
    let y = 200;
    doc.rect(40, y, 515, 22).fill(palette.primaryScale[100]);
    doc.fontSize(9).fillColor(palette.primary).text("Description", 50, y + 6);
    doc.text("Qty", 320, y + 6);
    doc.text(`Unit Price (${data.currencySymbol})`, 370, y + 6);
    doc.text(`Total (${data.currencySymbol})`, 480, y + 6);
    y += 28;

    // Items
    data.items.forEach((item) => {
      doc.fontSize(9).fillColor("#1e293b").text(item.description, 50, y);
      doc.text(item.quantity.toString(), 325, y);
      doc.text((item.unitPrice / 100).toFixed(2), 375, y);
      doc.text((item.total / 100).toFixed(2), 485, y);
      y += 20;
    });

    doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor("#cbd5e1").stroke();
    y += 15;

    // Summary
    const sym = data.currencySymbol;
    doc.fontSize(9).fillColor("#475569").text(`Subtotal:`, 380, y);
    doc.text(`${sym} ${(data.subtotal / 100).toFixed(2)}`, 485, y);
    y += 16;

    if (data.discount > 0) {
      doc.text(`Discount:`, 380, y);
      doc.text(`-${sym} ${(data.discount / 100).toFixed(2)}`, 485, y);
      y += 16;
    }

    doc.fontSize(11).fillColor(palette.primary).text(`Total Amount:`, 380, y);
    doc.text(`${sym} ${(data.total / 100).toFixed(2)}`, 485, y);
    y += 18;

    doc.fontSize(9).fillColor("#10b981").text(`Paid:`, 380, y);
    doc.text(`${sym} ${(data.paid / 100).toFixed(2)}`, 485, y);
    y += 16;

    if (data.due > 0) {
      doc.fontSize(10).fillColor("#ef4444").text(`Due Balance:`, 380, y);
      doc.text(`${sym} ${(data.due / 100).toFixed(2)}`, 485, y);
    } else {
      doc.fontSize(10).fillColor("#10b981").text(`Status: Fully Paid`, 380, y);
    }

    doc.rect(40, 750, 515, 2).fill(palette.primary);
    doc.fontSize(8).fillColor("#64748b").text("Thank you for choosing our care.", 40, 760);

    doc.end();
  });
}
