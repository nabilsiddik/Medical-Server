import axios from "axios";
import { prisma } from "../../../lib/prisma.js";
import { envVars } from "../../config/env.config.js";

// Generate professional structured answer from knowledge base
export const generateAiChatResponse = async (
  userMessage: string,
  patientName?: string,
): Promise<string> => {
  try {
    // 1. Gather all knowledge base context
    const clinic = await prisma.clinicSetting.findFirst();
    const chambers = await prisma.chamberLocation.findMany({
      where: { isActive: true },
      include: {
        schedules: {
          where: { isActive: true },
        },
      },
    });
    const services = await prisma.service.findMany({
      where: { isActive: true },
    });

    const doctorName = clinic?.doctorName || "MD. Nabil Siddik";
    const doctorSpecialty = clinic?.specialty || "Internal Medicine & Cardiovascular Specialist";
    const degrees = clinic?.degrees || "MBBS, FCPS (Medicine), MD, MACP (USA)";
    const consultationFee = clinic?.consultationFee || 1000;
    const phone = clinic?.phone || "01957282230";
    const emergencyPhone = clinic?.emergencyPhone || "12345678";

    // Format Chamber Timings & Multiple Breaks
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const chamberInfo = chambers
      .map((ch) => {
        const scheduleLines = ch.schedules
          .map((s) => {
            const dayName = dayNames[s.dayOfWeek] || `Day ${s.dayOfWeek}`;
            let breakInfo = "";
            if (s.breaks && Array.isArray(s.breaks) && (s.breaks as any[]).length > 0) {
              const breakList = (s.breaks as any[])
                .map((b) => `${b.startTime}-${b.endTime} (${b.title || "Break"})`)
                .join(", ");
              breakInfo = ` [Break times: ${breakList}]`;
            } else if (s.breakStartTime && s.breakEndTime) {
              breakInfo = ` [Break: ${s.breakStartTime}-${s.breakEndTime}]`;
            }
            return `  - ${dayName}: ${s.startTime} to ${s.endTime}${breakInfo}`;
          })
          .join("\n");
        return `* Chamber: ${ch.name}\n  Address: ${ch.address}, ${ch.city}\n  Contact: ${ch.phone || phone}\n  Schedules:\n${scheduleLines || "  - By appointment"}`;
      })
      .join("\n\n");

    // Format Services & Pricing
    const serviceInfo = services
      .map(
        (s) =>
          `- ${s.name}: ${s.price === 0 ? "FREE (0 BDT)" : `৳${s.price}`} (Duration: ${s.durationMinutes} mins) - ${s.description || ""}`,
      )
      .join("\n");

    // Google Sheet Knowledge Data
    let googleSheetKnowledge = "";
    if (Array.isArray(clinic?.knowledgeBaseData) && clinic.knowledgeBaseData.length > 0) {
      googleSheetKnowledge = "\nGoogle Sheet Knowledge Base:\n" +
        (clinic.knowledgeBaseData as any[])
          .slice(0, 15)
          .map((row: any) => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(" | "))
          .join("\n");
    }

    const systemPrompt = `You are the official AI Medical Assistant for ${doctorName} (${doctorSpecialty}, ${degrees}).
Your job is to assist patients in a polite, highly professional, empathetic, and structured way.
Answer questions directly using the knowledge base below.

Doctor & Practice Information:
Doctor: ${doctorName}
Specialty & Qualifications: ${doctorSpecialty} (${degrees})
BMDC Registration: ${clinic?.bmdcNumber || "A-54321"}
Standard Consultation Fee: ৳${consultationFee}
Helpline / Phone: ${phone}
Emergency Hotline: ${emergencyPhone}

Available Services & Appointment Pricing:
${serviceInfo}

Chamber Locations & Timings:
${chamberInfo}
${googleSheetKnowledge}

Guidelines:
1. Always be polite, courteous, and professional. Address the patient by name if available (${patientName || "Sir/Madam"}).
2. When asked about fees, list the available services (highlight that Free Report Review is ৳0).
3. When asked about locations or timings, specify the chambers and note that patient cannot book during doctor's break times.
4. For emergencies, explicitly urge the patient to call the hotline ${emergencyPhone} or visit the nearest emergency room.
5. Provide concise answers with bullet points or bold text where appropriate.
6. Keep medical advice general and recommend booking an appointment for personalized consultation.`;

    // Try Gemini API if key is configured
    const apiKey = envVars.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await axios.post(
          geminiUrl,
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nPatient Query: "${userMessage}"\n\nAI Response:`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          },
          { timeout: 8000 },
        );

        const candidates = response.data?.candidates;
        if (candidates && candidates[0]?.content?.parts?.[0]?.text) {
          return candidates[0].content.parts[0].text.trim();
        }
      } catch (geminiError: any) {
        console.warn("Gemini API call failed, using intelligent rule-based knowledge retrieval:", geminiError?.message);
      }
    }

    // Fallback: Intelligent Knowledge-Based Retrieval Engine
    const lower = userMessage.toLowerCase();
    const greeting = patientName ? `Hello ${patientName}` : "Hello";

    // 0. Search Linked Google Sheet Knowledge Base for matching Q&A or custom entries
    if (Array.isArray(clinic?.knowledgeBaseData) && clinic.knowledgeBaseData.length > 0) {
      const rows = clinic.knowledgeBaseData as Record<string, any>[];
      const searchWords = lower
        .replace(/[^\w\s\u0980-\u09FF]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      let bestMatchRow: Record<string, any> | null = null;
      let highestScore = 0;

      for (const row of rows) {
        let score = 0;
        const rowValues = Object.values(row).map((v) => String(v || "").toLowerCase());
        const rowString = rowValues.join(" ");

        // Direct phrase or substring match
        if (lower.length > 4 && rowString.includes(lower)) {
          score += 8;
        }

        // Word overlap
        for (const word of searchWords) {
          if (rowString.includes(word)) {
            score += 2;
          }
        }

        // Higher weight if matching question or title
        for (const [k, v] of Object.entries(row)) {
          const keyLower = k.toLowerCase();
          const valLower = String(v || "").toLowerCase();
          if (
            keyLower.includes("question") ||
            keyLower.includes("topic") ||
            keyLower.includes("service") ||
            keyLower.includes("faq")
          ) {
            for (const word of searchWords) {
              if (valLower.includes(word)) score += 4;
            }
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatchRow = row;
        }
      }

      // If a strong match is found in the Google Sheet
      if (bestMatchRow && highestScore >= 4) {
        const questionKey = Object.keys(bestMatchRow).find((k) =>
          /question|topic|service|title|faq/i.test(k),
        );
        const answerKey = Object.keys(bestMatchRow).find((k) =>
          /answer|detail|response|notes|desc|price|timing/i.test(k) && k !== questionKey,
        );

        if (questionKey && answerKey && bestMatchRow[answerKey]) {
          return `${greeting}!\n\n**${bestMatchRow[questionKey]}**\n${bestMatchRow[answerKey]}`;
        }

        // Return clean bullet points of the matched row
        const details = Object.entries(bestMatchRow)
          .filter(([_, v]) => String(v).trim().length > 0)
          .map(([k, v]) => `• **${k}**: ${v}`)
          .join("\n");

        return `${greeting}! Here is the information from our clinic knowledge base:\n\n${details}`;
      }
    }

    // 1. Fee / Pricing Query
    if (
      lower.includes("fee") ||
      lower.includes("cost") ||
      lower.includes("price") ||
      lower.includes("charge") ||
      lower.includes("free") ||
      lower.includes("টাকা") ||
      lower.includes("ফি")
    ) {
      return `${greeting}! Here are the consultation fees for **${doctorName}**:\n\n` +
        services.map((s) => `• **${s.name}**: ${s.price === 0 ? "**FREE (৳0)**" : `৳${s.price}`} (${s.durationMinutes} mins)`).join("\n") +
        `\n\n*Note: Report review is completely free within 14 days of consultation.* Would you like to book an appointment?`;
    }

    // 2. Chamber / Location / Address Query
    if (
      lower.includes("where") ||
      lower.includes("chamber") ||
      lower.includes("location") ||
      lower.includes("address") ||
      lower.includes("chember") ||
      lower.includes("dhanmondi") ||
      lower.includes("uttara") ||
      lower.includes("ঠিকানা")
    ) {
      return `${greeting}! **${doctorName}** provides consultations at the following chambers:\n\n` +
        chambers.map((ch, idx) => `${idx + 1}. **${ch.name}**\n   📍 ${ch.address}, ${ch.city}\n   📞 ${ch.phone || phone}`).join("\n\n") +
        `\n\nYou can select any of these chambers when booking your appointment.`;
    }

    // 3. Timings / Schedule / Break Times Query
    if (
      lower.includes("time") ||
      lower.includes("timing") ||
      lower.includes("schedule") ||
      lower.includes("when") ||
      lower.includes("break") ||
      lower.includes("hour") ||
      lower.includes("সময়") ||
      lower.includes("কখন")
    ) {
      return `${greeting}! Here is the consultation schedule for **${doctorName}**:\n\n` +
        chambers.map((ch) => {
          const lines = ch.schedules.map((s) => {
            const dayName = dayNames[s.dayOfWeek];
            let breakText = "";
            if (s.breaks && Array.isArray(s.breaks)) {
              breakText = " (Breaks excluded from booking)";
            }
            return `• **${dayName}**: ${s.startTime} - ${s.endTime}${breakText}`;
          }).join("\n");
          return `**${ch.name}**:\n${lines || "• Schedule available upon booking"}`;
        }).join("\n\n") +
        `\n\n*Please note: Patients cannot book during the doctor's scheduled break intervals.*`;
    }

    // 4. Appointment Booking Procedure Query
    if (
      lower.includes("book") ||
      lower.includes("appointment") ||
      lower.includes("serial") ||
      lower.includes("book an") ||
      lower.includes("অ্যাপয়েন্টমেন্ট")
    ) {
      return `${greeting}! Booking an appointment with **${doctorName}** is quick and simple:\n\n` +
        `1. Choose your preferred **Chamber** (e.g. Dhanmondi or Uttara).\n` +
        `2. Select the **Appointment Type** (e.g. General Consultation or Free Report Review).\n` +
        `3. Pick an **Available Date & Time Slot** (unavailable and break slots are excluded).\n` +
        `4. Fill in your name & phone number to instantly confirm your booking!\n\n` +
        `You can click **Book Appointment** at the top of the page.`;
    }

    // 5. Doctor Qualifications & Specialty Query
    if (
      lower.includes("who is") ||
      lower.includes("qualification") ||
      lower.includes("specialist") ||
      lower.includes("degree") ||
      lower.includes("doctor") ||
      lower.includes("experience")
    ) {
      return `**${doctorName}** is a **${doctorSpecialty}**.\n\n` +
        `• **Qualifications**: ${degrees}\n` +
        `• **BMDC Registration**: ${clinic?.bmdcNumber || "A-54321"}\n` +
        `• **Experience**: ${clinic?.experienceYears || 16}+ years of clinical practice\n\n` +
        `For personalized care, you can book an in-person chamber consultation or a video consultation.`;
    }

    // 6. Emergency Query
    if (
      lower.includes("emergency") ||
      lower.includes("urgent") ||
      lower.includes("chest pain") ||
      lower.includes("heart attack") ||
      lower.includes("জরুরি")
    ) {
      return `⚠️ **Emergency Notice:** If you or the patient are experiencing a medical emergency (such as acute chest pain, shortness of breath, or trauma), please call our **Emergency Hotline: ${emergencyPhone}** immediately or proceed to the nearest hospital emergency department!`;
    }

    // Default friendly response
    return `${greeting}! I am the AI Medical Assistant for **${doctorName}** (${doctorSpecialty}).\n\n` +
      `I can help you with:\n` +
      `• Consultation fees and appointment types (including free report review)\n` +
      `• Chamber locations, addresses, and available timings\n` +
      `• Doctor qualifications and appointment booking instructions\n\n` +
      `How may I assist you today?`;
  } catch (err: any) {
    console.error("AI Assistant error:", err);
    return `Hello! How may I help you with booking an appointment or information about Dr. Sarah Rahman's chambers and services?`;
  }
};

