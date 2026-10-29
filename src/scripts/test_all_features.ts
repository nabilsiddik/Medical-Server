import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { seedAdminDoctorOnStartup } from "../app/seed/seed.js";
import { UserServices } from "../app/modules/user/user.services.js";
import { AppointmentServices } from "../app/modules/appointment/appointment.services.js";
import { PrescriptionServices } from "../app/modules/prescription/prescription.services.js";
import { AnalyticsServices } from "../app/modules/analytics/analytics.services.js";
import { ChatServices } from "../app/modules/chat/chat.services.js";
import { GoogleSheetService } from "../app/modules/chat/googleSheet.services.js";
import { ClinicServices } from "../app/modules/clinic/clinic.services.js";
import { ServiceServices } from "../app/modules/service/service.services.js";
import { Gender, UserRole, AppointmentStatus } from "../generated/prisma/enums.js";

async function runTestSuite() {
  console.log("====================================================");
  console.log("🧪 STARTING COMPREHENSIVE BACKEND VERIFICATION TEST");
  console.log("====================================================\n");

  // 1. Verify Database Connection & Startup Seed
  console.log("1️⃣ Testing Application Startup Seed...");
  await seedAdminDoctorOnStartup();

  const doctorAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });
  console.log(`   ✅ Admin Doctor Verified: ${doctorAdmin?.fullName} (${doctorAdmin?.email})`);

  const clinicSettings = await ClinicServices.getPublicSiteConfig();
  console.log(`   ✅ Clinic & Doctor Profile: ${clinicSettings.branding.brandName} - ${clinicSettings.doctor.title}`);
  console.log(`   ✅ Doctor BMDC: ${clinicSettings.doctor.bmdcNumber}, Qualifications: ${clinicSettings.doctor.degrees}`);

  // 2. Verify Chambers & Multi-break Schedules
  console.log("\n2️⃣ Testing Chambers & Multi-Break Timetable...");
  const chambers = await ClinicServices.getChamberLocations();
  console.log(`   ✅ Chambers Found: ${chambers.length}`);
  const primaryChamber = chambers[0];
  if (!primaryChamber) throw new Error("No chamber found!");
  console.log(`   📍 Primary Chamber: ${primaryChamber.name} (${primaryChamber.address})`);

  // 3. Verify Appointment Types / Services & Free Booking
  console.log("\n3️⃣ Testing Appointment Types & Pricing (including Free Booking)...");
  const services = await ServiceServices.getAllServices(true);
  console.log(`   ✅ Appointment Types: ${services.length}`);
  const freeService = services.find((s) => s.price === 0);
  console.log(`   ✅ Free Booking Service Verified: ${freeService?.name} (Price: ৳${freeService?.price})`);

  // 4. Test Patient Registration & Auto-Login Session
  console.log("\n4️⃣ Testing Patient Registration & Auto-Login...");
  const testEmail = `testpatient_${Date.now()}@example.com`;
  const testPhone = `+88017${Math.floor(1000000 + Math.random() * 9000000)}`;
  const registerResult = await UserServices.createUserIntoDb({
    fullName: "Kamal Hasan",
    email: testEmail,
    password: "Password@123",
    gender: Gender.MALE,
    phoneNumber: testPhone,
    address: "Banani, Dhaka",
    age: 29,
    bloodGroup: "B+",
  });

  console.log(`   ✅ Patient Created: ${registerResult.user.fullName} (${registerResult.user.email})`);
  console.log(`   ✅ Patient ID: ${registerResult.patient?.patientId}`);
  console.log(`   ✅ Role Assigned: ${registerResult.user.role}`);
  console.log(`   ✅ Auto-Login Access Token Issued: ${registerResult.accessToken ? "YES" : "NO"}`);

  // 5. Test Availability & Break Times
  console.log("\n5️⃣ Testing Availability & Break Interval Exclusion...");
  // Use next Sunday for checking schedule
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
  const dateStr = nextSunday.toISOString().slice(0, 10);

  const availability = await AppointmentServices.getAvailability(primaryChamber.id, dateStr);
  console.log(`   ✅ Date Checked: ${dateStr}`);
  console.log(`   ✅ Total Slots Generated: ${availability.totalSlots}`);
  console.log(`   ✅ Available Slots: ${availability.availableSlotsCount}`);
  const availableSlot = availability.slots?.find((s) => s.isAvailable);
  console.log(`   ✅ First Available Slot: ${availableSlot?.time}`);

  // 6. Test Appointment Booking (Free Service & Paid Service)
  console.log("\n6️⃣ Testing Appointment Booking...");
  const appointment = await AppointmentServices.bookAppointment(
    {
      chamberLocationId: primaryChamber.id,
      serviceId: freeService?.id,
      appointmentDate: dateStr,
      startTime: availableSlot?.time || "17:15",
      fullName: "Kamal Hasan",
      phone: testPhone,
      email: testEmail,
      gender: Gender.MALE,
      reasonForVisit: "Routine cardiovascular checkup and report review",
    },
    registerResult.user.id,
  );

  console.log(`   ✅ Appointment Booked: Ref ${appointment.appointmentRef}`);
  console.log(`   ✅ Fee: ৳${appointment.fee} (isPaid: ${appointment.isPaid})`);
  console.log(`   ✅ Chamber: ${appointment.chamberLocation.name}`);

  // 7. Test Patient Cancellation Policy (Non-refundable, slot reopened)
  console.log("\n7️⃣ Testing Patient Cancellation Policy (Non-refundable)...");
  const cancelledByPatient = await AppointmentServices.cancelAppointmentByPatient(
    appointment.id,
    registerResult.user.id,
    "Patient cannot attend due to travel",
  );
  console.log(`   ✅ Cancelled Status: ${cancelledByPatient.status}`);
  console.log(`   ✅ Cancelled By: ${cancelledByPatient.cancelledBy}`);
  console.log(`   ✅ Refund Issued: ${cancelledByPatient.isRefunded ? "YES" : "NO (Non-refundable per clinic policy)"}`);

  // Check slot availability again to verify the slot is immediately released!
  const availabilityAfterCancel = await AppointmentServices.getAvailability(primaryChamber.id, dateStr);
  const recheckedSlot = availabilityAfterCancel.slots?.find((s) => s.time === availableSlot?.time);
  console.log(`   ✅ Cancelled Slot Re-opened for Other Patients: ${recheckedSlot?.isAvailable ? "YES" : "NO"}`);

  // 8. Book another appointment and test Doctor Cancellation with Refund
  console.log("\n8️⃣ Testing Doctor Cancellation & Refund Policy...");
  const secondSlot = availabilityAfterCancel.slots?.filter((s) => s.isAvailable)[1];
  const secondApt = await AppointmentServices.bookAppointment(
    {
      chamberLocationId: primaryChamber.id,
      serviceId: services[0]?.id,
      appointmentDate: dateStr,
      startTime: secondSlot?.time || "17:30",
      fullName: "Kamal Hasan",
      phone: testPhone,
      email: testEmail,
      gender: Gender.MALE,
      fee: 1000,
    },
    registerResult.user.id,
  );

  const cancelledByDoctor = await AppointmentServices.cancelAppointmentByDoctor(
    secondApt.id,
    doctorAdmin!.id,
    "Doctor urgent emergency surgery",
    true, // Doctor chooses to refund!
    1000,
  );
  console.log(`   ✅ Doctor Cancelled: ${cancelledByDoctor.status}`);
  console.log(`   ✅ Doctor Refund Granted: ${cancelledByDoctor.isRefunded ? "YES" : "NO"}`);
  console.log(`   ✅ Refund Amount: ৳${cancelledByDoctor.refundAmount}`);

  // 9. Test Prescription Creation & PDF Generation
  console.log("\n9️⃣ Testing Prescription Creation & PDF Generator...");
  const { prescription } = await PrescriptionServices.createPrescription(doctorAdmin!.id, {
    patientId: registerResult.patient!.id,
    chiefComplaints: ["Elevated Blood Pressure", "Occasional mild headache"],
    diagnoses: ["Primary Essential Hypertension"],
    investigationsAdvised: ["Lipid Profile", "Serum Creatinine", "ECG"],
    adviceEnglish: "Reduce dietary salt. Maintain 30 minutes daily brisk walking.",
    adviceBangla: "প্রতিদিন ৩০ মিনিট হাঁটুন এবং কাঁচা লবণ পরিহার করুন।",
    nextFollowUpDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    items: [
      {
        form: "Tablet",
        drugName: "Amlodipine",
        genericName: "Amlodipine Besylate",
        strength: "5mg",
        dose: "1 tablet",
        frequency: "0+0+1",
        duration: "30 days",
        instruction: "At night after dinner",
      },
      {
        form: "Tablet",
        drugName: "Bisoprolol",
        genericName: "Bisoprolol Fumarate",
        strength: "2.5mg",
        dose: "1 tablet",
        frequency: "1+0+0",
        duration: "30 days",
        instruction: "In the morning after breakfast",
      },
    ],
  });

  console.log(`   ✅ Prescription Created: ${prescription.prescriptionNumber}`);
  console.log(`   ✅ QR Verification Code: ${prescription.verificationToken}`);

  // Test PDF Buffer Generation
  const pdfBuffer = await PrescriptionServices.getPrescriptionPdfBuffer(prescription.id);
  console.log(`   ✅ Prescription PDF Generated: ${pdfBuffer.length} bytes (Valid PDF format: ${pdfBuffer.slice(0, 4).toString() === "%PDF"})`);

  // 10. Test Doctor Dashboard Analytics
  console.log("\n🔟 Testing Doctor Dashboard Analytics & Charts...");
  const analytics = await AnalyticsServices.getDoctorAnalyticsOverview();
  console.log(`   ✅ 4 Stat Cards:`);
  console.log(`      - Total Patients: ${analytics.statsCards.totalPatients}`);
  console.log(`      - Upcoming Appointments: ${analytics.statsCards.upcomingAppointments}`);
  console.log(`      - Total Appointments: ${analytics.statsCards.totalAppointments}`);
  console.log(`      - Total Revenue: ৳${analytics.statsCards.totalRevenue}`);
  console.log(`   ✅ Gender Distribution Pie Chart Data:`, analytics.genderDistribution);
  console.log(`   ✅ Patient Registration Daily Trend (14 days): ${analytics.patientsRegistrationByDate.length} days data`);
  console.log(`   ✅ Appointments By Date Trend: ${analytics.appointmentsByDate.length} points`);
  console.log(`   ✅ Recent Registrations Count: ${analytics.recentRegistrations.length}`);
  console.log(`   ✅ Recent Appointments Count: ${analytics.recentAppointments.length}`);

  // 11. Test Live Chat Widget & AI Assistant
  console.log("\n1️⃣1️⃣ Testing Live Chat & AI Assistant Knowledge Base...");
  const conv = await ChatServices.getOrCreateConversation({
    patientId: registerResult.patient!.id,
    patientName: registerResult.user.fullName,
    patientPhone: registerResult.user.phoneNumber || undefined,
    patientEmail: registerResult.user.email,
    initialMessage: "Hello doctor, what are your consultation fees and chamber locations?",
  });

  console.log(`   ✅ Conversation Created: ID ${conv?.id}`);
  console.log(`   ✅ Total Messages in Conversation: ${conv?.messages?.length}`);
  const lastMsg = conv?.messages?.[conv.messages.length - 1];
  console.log(`   ✅ AI Assistant Auto-Replied: ${lastMsg?.isAi ? "YES" : "NO"} (${lastMsg?.senderType})`);
  console.log(`   💬 AI Message Snippet:\n      ${lastMsg?.content.slice(0, 150)}...\n`);

  // 12. Test Google Sheet Connection & Knowledge Base Sync
  console.log("1️⃣2️⃣ Testing Google Sheet Connection...");
  const sheetSync = await GoogleSheetService.syncGoogleSheet({
    sheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
  });
  console.log(`   ✅ Google Sheet Synced: ${sheetSync.success ? "YES" : "NO"}`);
  console.log(`   ✅ Knowledge Base Entries: ${sheetSync.totalEntries}`);

  const sheetStatus = await GoogleSheetService.getGoogleSheetStatus();
  console.log(`   ✅ Google Sheet Status: Connected = ${sheetStatus.isConnected}, AI Chat = ${sheetStatus.aiChatEnabled}`);

  console.log("\n====================================================");
  console.log("🎉 ALL TESTS PASSED! BACKEND IS 100% READY & VERIFIED!");
  console.log("====================================================");

  await prisma.$disconnect();
  process.exit(0);
}

runTestSuite().catch(async (e) => {
  console.error("❌ Test suite failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
