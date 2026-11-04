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

    // Left sidebar: Complaints & Diagnosis (constrained width to avoid overlapping divider)
    let leftY = startY;
    if (data.chiefComplaints && data.chiefComplaints.length > 0) {
      doc.fontSize(10).fillColor(palette.secondary).font("Helvetica-Bold").text("Chief Complaints:", 40, leftY, { width: 125 });
      leftY = doc.y + 4;
      doc.font("Helvetica");
      data.chiefComplaints.forEach((c) => {
        doc.fontSize(8).fillColor("#334155").text(`• ${c}`, 45, leftY, { width: 120, lineGap: 2 });
        leftY = doc.y + 3;
      });
      leftY += 6;
    }

    if (data.diagnoses && data.diagnoses.length > 0) {
      doc.fontSize(10).fillColor(palette.secondary).font("Helvetica-Bold").text("Diagnosis:", 40, leftY, { width: 125 });
      leftY = doc.y + 4;
      doc.font("Helvetica");
      data.diagnoses.forEach((d) => {
        doc.fontSize(8).fillColor("#334155").text(`• ${d}`, 45, leftY, { width: 120, lineGap: 2 });
        leftY = doc.y + 3;
      });
      leftY += 6;
    }

    if (data.investigations && data.investigations.length > 0) {
      doc.fontSize(10).fillColor(palette.secondary).font("Helvetica-Bold").text("Investigations:", 40, leftY, { width: 125 });
      leftY = doc.y + 4;
      doc.font("Helvetica");
      data.investigations.forEach((inv) => {
        doc.fontSize(8).fillColor("#334155").text(`• ${inv}`, 45, leftY, { width: 120, lineGap: 2 });
        leftY = doc.y + 3;
      });
    }

    // Divider line between columns
    doc.moveTo(175, startY).lineTo(175, 700).strokeColor("#e2e8f0").stroke();

    // Right column: Rx Medications
    let rightY = startY;
    doc
      .fontSize(16)
      .fillColor(palette.primary)
      .font("Helvetica-Bold")
      .text("Rx", 195, rightY - 4);
    doc.font("Helvetica");
    rightY += 22;

    data.items.forEach((item, idx) => {
      // Drug line: 1. Tab. Napa Extra (500mg)
      const formStr = item.form ? `${item.form} ` : "";
      const strengthStr = item.strength ? ` (${item.strength})` : "";
      doc
        .fontSize(10)
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .text(
          `${idx + 1}.  ${formStr}${item.name}${strengthStr}`,
          195,
          rightY,
          { width: 345 }
        );
      doc.font("Helvetica");
      rightY = doc.y + 3;

      // Dosage & instruction: 1+0+1  •  5 days  •  After meal (avoid duplicating when dose === frequency)
      const dosageParts: string[] = [];
      if (item.dose) dosageParts.push(item.dose);
      if (item.frequency && item.frequency !== item.dose) dosageParts.push(item.frequency);
      if (item.duration) dosageParts.push(item.duration);
      if (item.instruction) dosageParts.push(item.instruction);

      if (dosageParts.length > 0) {
        doc
          .fontSize(8)
          .fillColor("#475569")
          .text(
            dosageParts.join("  •  "),
            210,
            rightY,
            { width: 330 }
          );
        rightY = doc.y + 8;
      } else {
        rightY += 6;
      }
    });

    // Advice block
    if (data.adviceEnglish || data.adviceBangla) {
      rightY = Math.max(rightY + 12, 530);
      doc.fontSize(10).fillColor(palette.secondary).font("Helvetica-Bold").text("Advice & Instructions:", 195, rightY, { width: 345 });
      rightY = doc.y + 4;
      doc.font("Helvetica");
      if (data.adviceEnglish) {
        doc.fontSize(8).fillColor("#334155").text(data.adviceEnglish, 195, rightY, { width: 345, lineGap: 2 });
        rightY = doc.y + 4;
      }
      if (data.adviceBangla) {
        doc.fontSize(8).fillColor("#334155").text(data.adviceBangla, 195, rightY, { width: 345, lineGap: 2 });
        rightY = doc.y + 4;
      }
    }

    if (data.nextFollowUpDate) {
      rightY += 6;
      doc
        .fontSize(9)
        .fillColor(palette.primary)
        .font("Helvetica-Bold")
        .text(`Next Follow-up: ${data.nextFollowUpDate}`, 195, rightY, { width: 345 });
      doc.font("Helvetica");
    }

    // 4. Footer & Digital Signature
    doc.rect(40, 715, 515, 1).fill("#cbd5e1");

    doc
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        `Generated electronically by ${data.clinic.name}. Authentic copy with QR verification.`,
        40,
        725,
        { width: 280 }
      );
    doc
      .fontSize(7)
      .fillColor("#94a3b8")
      .text(
        `Prescription Ref: ${data.prescriptionNumber} • Date: ${data.date}`,
        40,
        740,
        { width: 280 }
      );

    // Digital Signature stamp
    doc
      .fontSize(8)
      .fillColor(palette.primary)
      .font("Helvetica-Bold")
      .text("Digitally Signed by:", 340, 722, { width: 215, align: "right" });
    doc
      .fontSize(10)
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .text(data.doctor.name, 340, 734, { width: 215, align: "right" });
    doc
      .fontSize(8)
      .fillColor("#475569")
      .font("Helvetica")
      .text(`BMDC Reg. No: ${data.doctor.bmdcNumber || "Registered"}`, 340, 747, { width: 215, align: "right" });

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
