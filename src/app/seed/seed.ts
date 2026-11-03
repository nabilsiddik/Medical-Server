import "dotenv/config";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcryptjs";
import {
  UserRole,
  UserStatus,
  Gender,
  AppointmentStatus,
  AppointmentBookingMode,
  ConsultationType,
} from "../../generated/prisma/enums.js";

export async function seedAdminDoctorOnStartup() {
  try {
    // 1. Seed or update Clinic Settings & Doctor Profile
    const existingClinic = await prisma.clinicSetting.findFirst();
    let clinic = existingClinic;

    if (!clinic) {
      console.log("🏥 Initializing Doctor Clinic & Profile Settings...");
      clinic = await prisma.clinicSetting.create({
        data: {
          doctorName: "Prof. Dr. Sarah Rahman",
          doctorTitle: "Senior Consultant Physician & Cardiologist",
          specialty: "Internal Medicine & Preventive Cardiology",
          degrees: "MBBS, FCPS (Medicine), MD (Cardiology), MRCP (UK)",
          bmdcNumber: "A-54321",
          experienceYears: 16,
          bio: "Prof. Dr. Sarah Rahman is a distinguished specialist with 16+ years of clinical experience, dedicated to providing compassionate, evidence-based healthcare with a focus on cardiology and chronic illness management.",
          aboutHtml: "<p>Dedicated to delivering personalized medical care with cutting-edge diagnostics, patient education, and compassionate bedside manner across multiple chambers.</p>",
          phone: "+880 1700-000000",
          emergencyPhone: "+880 1700-111111",
          email: "doctor@chamber.com",
          whatsappNumber: "+8801700000000",
          address: "House 45, Road 7/A, Dhanmondi, Dhaka-1209",
          languages: ["English", "Bangla"],
          currency: "BDT",
          currencySymbol: "৳",
          timezone: "Asia/Dhaka",
          dateFormat: "DD/MM/YYYY",
          defaultLanguage: "en",

          // Profile Enhancements
          certifications: [
            "Certified in Advanced Cardiovascular Life Support (ACLS)",
            "Fellow of the American College of Physicians (FACP)",
            "European Society of Cardiology (ESC) Certified",
          ],
          certificateDocuments: [
            {
              title: "BMDC Specialist Full Registration Certificate",
              url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
              issueDate: "2010-06-15",
            },
            {
              title: "FCPS Postgraduate Degree Certificate",
              url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
              issueDate: "2015-01-20",
            },
          ],
          awards: [
            "National Health Excellence Award 2023",
            "Best Clinical Research in Preventive Cardiology 2021",
          ],
          consultationFee: 1000,
          videoConsultationFee: 800,
          doctorPhoto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
          socialLinks: {
            facebook: "https://facebook.com",
            linkedin: "https://linkedin.com",
            twitter: "https://twitter.com",
            website: "https://drsarahrahman.com",
          },

          // Single-Source Branding
          brandName: "Dr. Sarah's Care Chamber",
          brandTagline: "Trusted Clinical Care & Preventive Health",
          primaryColor: "#0284c7",
          secondaryColor: "#0f766e",
          logoUrl: "",
          faviconUrl: "",

          defaultBookingMode: AppointmentBookingMode.SLOT_BASED,
          defaultSlotDuration: 15,
          bufferBetweenSlots: 5,
          advanceBookingDays: 30,
          minLeadTimeHours: 2,
          followUpDiscountDays: 14,
          followUpDiscountPercent: 50,
          requirePrepayment: false,
          depositAmount: 0,
          noticeBoard: "Chamber is open 6 days a week. For emergency appointments, call our helpline directly.",
          aiChatEnabled: true,
        },
      });
    }

    // 2. Seed Admin Doctor User Account
    const adminEmail = process.env.ADMIN_EMAIL || "doctor@chamber.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Doctor@123456";
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      console.log(`👨‍⚕️ Seeding Admin Doctor Account (${adminEmail})...`);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = await prisma.user.create({
        data: {
          fullName: "Prof. Dr. Sarah Rahman",
          email: adminEmail,
          phoneNumber: "+8801700000000",
          gender: Gender.FEMALE,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          isPhoneVerified: true,
          status: UserStatus.ACTIVE,
          authAccounts: {
            create: {
              provider: "CREDENTIAL",
              providerAccountId: adminEmail,
              password: hashedPassword,
            },
          },
        },
      });
      console.log(`✅ Admin Doctor created: ${adminEmail} (password: ${adminPassword})`);
    }

    // 3. Seed Chambers
    const chamberCount = await prisma.chamberLocation.count();
    if (chamberCount === 0) {
      console.log("📍 Seeding initial chamber locations...");
      const dhanmondi = await prisma.chamberLocation.create({
        data: {
          name: "Dhanmondi Central Chamber",
          address: "House 45, Road 7/A, Green Crescent Tower (4th Floor)",
          city: "Dhaka",
          postalCode: "1209",
          phone: "+880 1700-000000",
          roomNumber: "402",
          floor: "4th Floor",
          slotDuration: 15,
          dailySerialLimit: 40,
          isActive: true,
          displayOrder: 1,
          schedules: {
            create: [0, 1, 2, 3, 4].map((day) => ({
              dayOfWeek: day, // Sun to Thu
              startTime: "17:00",
              endTime: "21:00",
              slotDuration: 15,
              breaks: [
                {
                  startTime: "18:30",
                  endTime: "19:00",
                  title: "Evening Prayer & Refreshment",
                },
              ],
              maxPatients: 20,
              isActive: true,
            })),
          },
        },
      });

      const uttara = await prisma.chamberLocation.create({
        data: {
          name: "Uttara Specialist Clinic",
          address: "Plot 18, Sector 4, Rabindra Sarani, Uttara",
          city: "Dhaka",
          postalCode: "1230",
          phone: "+880 1800-111222",
          roomNumber: "205",
          floor: "2nd Floor",
          slotDuration: 15,
          dailySerialLimit: 30,
          isActive: true,
          displayOrder: 2,
          schedules: {
            create: [
              {
                dayOfWeek: 5, // Friday morning
                startTime: "09:00",
                endTime: "12:30",
                slotDuration: 15,
                breaks: [
                  {
                    startTime: "10:30",
                    endTime: "10:45",
                    title: "Morning Break",
                  },
                ],
                maxPatients: 15,
                isActive: true,
              },
              {
                dayOfWeek: 6, // Saturday evening
                startTime: "16:00",
                endTime: "20:00",
                slotDuration: 15,
                breaks: [
                  {
                    startTime: "18:00",
                    endTime: "18:30",
                    title: "Prayer Break",
                  },
                ],
                maxPatients: 18,
                isActive: true,
              },
            ],
          },
        },
      });
      console.log(`✅ Seeded Chambers: ${dhanmondi.name}, ${uttara.name}`);
    }

    // 4. Seed Services / Appointment Types
    const serviceCount = await prisma.service.count();
    if (serviceCount === 0) {
      console.log("🩺 Seeding Appointment Types & Pricing...");
      await prisma.service.createMany({
        data: [
          {
            name: "General Consultation",
            slug: "general-consultation",
            description: "Comprehensive physical evaluation, symptoms review, and clinical diagnosis.",
            durationMinutes: 15,
            price: 1000,
            followUpPrice: 500,
            consultationType: ConsultationType.IN_PERSON,
            isActive: true,
            isFeatured: true,
            displayOrder: 1,
          },
          {
            name: "Follow-Up Consultation",
            slug: "follow-up-consultation",
            description: "Review of treatment response, symptom progress, and medication adjustment within 14 days.",
            durationMinutes: 15,
            price: 500,
            followUpPrice: 500,
            consultationType: ConsultationType.IN_PERSON,
            isActive: true,
            isFeatured: true,
            displayOrder: 2,
          },
          {
            name: "Free Report Review",
            slug: "free-report-review",
            description: "Complimentary review of diagnostic and laboratory test results ordered by the doctor.",
            durationMinutes: 10,
            price: 0, // Free booking as requested!
            followUpPrice: 0,
            consultationType: ConsultationType.IN_PERSON,
            isActive: true,
            isFeatured: true,
            displayOrder: 3,
          },
          {
            name: "Online Video Consultation",
            slug: "online-video-consultation",
            description: "High-definition remote video consultation for patients unable to visit the chamber.",
            durationMinutes: 20,
            price: 800,
            followUpPrice: 400,
            consultationType: ConsultationType.VIDEO,
            isActive: true,
            isFeatured: true,
            displayOrder: 4,
          },
        ],
      });
      console.log("✅ Seeded Services / Appointment Types (including free booking)");
    } else {
      // Ensure Free Report Review exists with price 0
      await prisma.service.upsert({
        where: { slug: "free-report-review" },
        create: {
          name: "Free Report Review",
          slug: "free-report-review",
          description: "Complimentary review of diagnostic and laboratory test results ordered by the doctor.",
          durationMinutes: 10,
          price: 0,
          followUpPrice: 0,
          consultationType: ConsultationType.IN_PERSON,
          isActive: true,
          isFeatured: true,
          displayOrder: 3,
        },
        update: {
          price: 0,
          isActive: true,
        },
      });
    }

    // 5. Seed a demo Patient if no patients exist
    const patientCount = await prisma.patient.count();
    if (patientCount === 0) {
      console.log("👥 Seeding demo patient account...");
      const patientHashed = await bcrypt.hash("Patient@123456", 10);
      const demoUser = await prisma.user.create({
        data: {
          fullName: "Tanvir Ahmed",
          email: "patient@example.com",
          phoneNumber: "+8801811223344",
          gender: Gender.MALE,
          role: UserRole.PATIENT,
          isEmailVerified: true,
          status: UserStatus.ACTIVE,
          authAccounts: {
            create: {
              provider: "CREDENTIAL",
              providerAccountId: "patient@example.com",
              password: patientHashed,
            },
          },
          patient: {
            create: {
              patientId: "PAT-2026-0001",
              fullName: "Tanvir Ahmed",
              phone: "+8801811223344",
              email: "patient@example.com",
              gender: Gender.MALE,
              age: 32,
              bloodGroup: "O+",
              address: "Sector 3, Uttara, Dhaka",
              allergies: ["Penicillin"],
              chronicConditions: ["Hypertension"],
            },
          },
        },
        include: {
          patient: true,
        },
      });
      console.log(`✅ Seeded demo patient: ${demoUser.email} (password: Patient@123456)`);
    }

    
    // 6. Seed Demo Doctor (Read-Only account for prospective doctor live preview)
    const demoDoctorEmail = "demo.doctor@chamber.com";
    const demoDoctorPassword = "Demo@Doctor2026";
    let demoDoctorUser = await prisma.user.findUnique({
      where: { email: demoDoctorEmail },
      include: { authAccounts: true },
    });

    const demoDoctorHashed = await bcrypt.hash(demoDoctorPassword, 10);

    if (!demoDoctorUser) {
      console.log(`👨‍⚕️ Seeding Demo Doctor Account (${demoDoctorEmail})...`);
      demoDoctorUser = await prisma.user.create({
        data: {
          fullName: "Dr. Demo Doctor (Read-Only)",
          email: demoDoctorEmail,
          phoneNumber: "+8801900000001",
          gender: Gender.MALE,
          role: UserRole.ADMIN,
          isEmailVerified: true,
          isPhoneVerified: true,
          status: UserStatus.ACTIVE,
          authAccounts: {
            create: {
              provider: "CREDENTIAL",
              providerAccountId: demoDoctorEmail,
              password: demoDoctorHashed,
            },
          },
        },
        include: { authAccounts: true },
      });
      console.log(`✅ Demo Doctor created: ${demoDoctorEmail} (password: ${demoDoctorPassword})`);
    } else {
      const credentialAcc = demoDoctorUser.authAccounts.find((a) => a.provider === "CREDENTIAL");
      if (credentialAcc) {
        await prisma.authAccount.update({
          where: { id: credentialAcc.id },
          data: { password: demoDoctorHashed },
        });
      } else {
        await prisma.authAccount.create({
          data: {
            userId: demoDoctorUser.id,
            provider: "CREDENTIAL",
            providerAccountId: demoDoctorEmail,
            password: demoDoctorHashed,
          },
        });
      }
      await prisma.user.update({
        where: { id: demoDoctorUser.id },
        data: {
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          role: UserRole.ADMIN,
        },
      });
    }

    // 7. Seed Demo Patient (Read-Only account for prospective patient live preview)
    const demoPatientEmail = "demo.patient@chamber.com";
    const demoPatientPassword = "Demo@Patient2026";
    let demoPatientUser = await prisma.user.findUnique({
      where: { email: demoPatientEmail },
      include: { authAccounts: true, patient: true },
    });

    const demoPatientHashed = await bcrypt.hash(demoPatientPassword, 10);

    if (!demoPatientUser) {
      console.log(`👤 Seeding Demo Patient Account (${demoPatientEmail})...`);
      demoPatientUser = await prisma.user.create({
        data: {
          fullName: "Demo Patient (Read-Only)",
          email: demoPatientEmail,
          phoneNumber: "+8801900000002",
          gender: Gender.FEMALE,
          role: UserRole.PATIENT,
          isEmailVerified: true,
          status: UserStatus.ACTIVE,
          authAccounts: {
            create: {
              provider: "CREDENTIAL",
              providerAccountId: demoPatientEmail,
              password: demoPatientHashed,
            },
          },
          patient: {
            create: {
              patientId: "PAT-DEMO-0001",
              fullName: "Demo Patient (Read-Only)",
              phone: "+8801900000002",
              email: demoPatientEmail,
              gender: Gender.FEMALE,
              age: 28,
              bloodGroup: "B+",
              address: "Dhanmondi, Dhaka",
              allergies: ["Dust"],
              chronicConditions: ["None"],
            },
          },
        },
        include: { authAccounts: true, patient: true },
      });
      console.log(`✅ Demo Patient created: ${demoPatientEmail} (password: ${demoPatientPassword})`);
    } else {
      const credentialAcc = demoPatientUser.authAccounts.find((a) => a.provider === "CREDENTIAL");
      if (credentialAcc) {
        await prisma.authAccount.update({
          where: { id: credentialAcc.id },
          data: { password: demoPatientHashed },
        });
      } else {
        await prisma.authAccount.create({
          data: {
            userId: demoPatientUser.id,
            provider: "CREDENTIAL",
            providerAccountId: demoPatientEmail,
            password: demoPatientHashed,
          },
        });
      }
      if (!demoPatientUser.patient) {
        await prisma.patient.create({
          data: {
            userId: demoPatientUser.id,
            patientId: "PAT-DEMO-0001",
            fullName: "Demo Patient (Read-Only)",
            phone: "+8801900000002",
            email: demoPatientEmail,
            gender: Gender.FEMALE,
            age: 28,
            bloodGroup: "B+",
            address: "Dhanmondi, Dhaka",
            allergies: ["Dust"],
            chronicConditions: ["None"],
          },
        });
      }
      await prisma.user.update({
        where: { id: demoPatientUser.id },
        data: {
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          role: UserRole.PATIENT,
        },
      });
    }

    console.log("✨ Seed initialization finished successfully.");
  } catch (error) {
    console.error("❌ Seed initialization error:", error);
  }
}

// Standalone seed runner
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedAdminDoctorOnStartup()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
