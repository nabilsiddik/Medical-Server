import readline from "readline";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { UserRole, UserStatus, Gender } from "../generated/prisma/enums.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query: string, defaultVal?: string): Promise<string> => {
  return new Promise((resolve) => {
    const prompt = defaultVal ? `${query} [${defaultVal}]: ` : `${query}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
};

async function runOnboarding() {
  console.log("\n=======================================================");
  console.log("🩺 DOCTOR PRACTICE & PATIENT MANAGEMENT ONBOARDING WIZARD");
  console.log("=======================================================\n");

  try {
    // 1. Doctor Credentials
    console.log("--- 1. Doctor Profile & Credentials ---");
    const doctorName = await ask("Doctor Full Name", "Dr. Sarah Rahman");
    const doctorTitle = await ask("Degrees & Titles", "MBBS, FCPS (Medicine)");
    const specialty = await ask("Medical Specialty", "General Medicine & Internal Health");
    const bmdcNumber = await ask("BMDC Registration #", "A-54321");
    const email = await ask("Doctor Login Email", "doctor@chamber.com");
    const password = await ask("Doctor Login Password", "Doctor@123456");

    // 2. Practice & Branding
    console.log("\n--- 2. Clinic Identity & Branding ---");
    const brandName = await ask("Clinic / Chamber Brand Name", `${doctorName}'s Care Chamber`);
    const brandTagline = await ask("Tagline", "Trusted Clinical Care & Preventive Health");
    const primaryColor = await ask("Primary Brand Hex Color", "#0284c7");
    const secondaryColor = await ask("Secondary Accent Hex Color", "#0f766e");
    const phone = await ask("Chamber Contact Phone", "+880 1700-000000");
    const emergencyPhone = await ask("Emergency Hotline", "+880 1700-111111");

    // 3. Primary Chamber Location
    console.log("\n--- 3. Primary Chamber Location ---");
    const chamberName = await ask("Chamber Name", "Dhanmondi Central Care Chamber");
    const chamberAddress = await ask("Street Address", "House 42, Road 9/A, Dhanmondi");
    const city = await ask("City", "Dhaka");
    const slotDuration = parseInt(await ask("Slot Duration in Minutes", "15"), 10) || 15;

    console.log("\n⏳ Applying configuration to database...");

    // A. Update or create Clinic Settings
    const existingClinic = await prisma.clinicSetting.findFirst();
    let clinic;
    if (existingClinic) {
      clinic = await prisma.clinicSetting.update({
        where: { id: existingClinic.id },
        data: {
          brandName,
          brandTagline,
          doctorName,
          doctorTitle,
          specialty,
          degrees: doctorTitle,
          bmdcNumber,
          primaryColor,
          secondaryColor,
          phone,
          emergencyPhone,
        },
      });
    } else {
      clinic = await prisma.clinicSetting.create({
        data: {
          brandName,
          brandTagline,
          doctorName,
          doctorTitle,
          specialty,
          degrees: doctorTitle,
          bmdcNumber,
          primaryColor,
          secondaryColor,
          phone,
          emergencyPhone,
        },
      });
    }

    // B. Create / Update Doctor Admin User Account
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingDoctor = await prisma.user.findUnique({ where: { email } });
    if (!existingDoctor) {
      await prisma.user.create({
        data: {
          fullName: doctorName,
          email,
          role: UserRole.ADMIN,
          gender: Gender.FEMALE,
          isEmailVerified: true,
          isPhoneVerified: true,
          status: UserStatus.ACTIVE,
          authAccounts: {
            create: {
              provider: "CREDENTIAL",
              providerAccountId: email,
              password: hashedPassword,
            },
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { email },
        data: {
          fullName: doctorName,
          role: UserRole.ADMIN,
        },
      });
      await prisma.authAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: "CREDENTIAL",
            providerAccountId: email,
          },
        },
        create: {
          userId: existingDoctor.id,
          provider: "CREDENTIAL",
          providerAccountId: email,
          password: hashedPassword,
        },
        update: {
          password: hashedPassword,
        },
      });
    }

    // C. Create Chamber Location
    const chamber = await prisma.chamberLocation.create({
      data: {
        name: chamberName,
        address: chamberAddress,
        city,
        phone,
        slotDuration,
        isActive: true,
        schedules: {
          create: [
            {
              dayOfWeek: 0, // Sunday
              startTime: "17:00",
              endTime: "21:00",
              slotDuration,
              breaks: [{ startTime: "19:00", endTime: "19:30", title: "Evening Prayer & Break" }],
              maxPatients: 20,
              isActive: true,
            },
            {
              dayOfWeek: 1, // Monday
              startTime: "17:00",
              endTime: "21:00",
              slotDuration,
              breaks: [{ startTime: "19:00", endTime: "19:30", title: "Evening Prayer & Break" }],
              maxPatients: 20,
              isActive: true,
            },
          ],
        },
      },
    });

    console.log("\n=======================================================");
    console.log("🎉 ONBOARDING COMPLETED SUCCESSFULLY!");
    console.log("=======================================================");
    console.log(`Clinic:     ${clinic.brandName}`);
    console.log(`Doctor:     ${doctorName} (${doctorTitle})`);
    console.log(`BMDC Reg:   ${bmdcNumber}`);
    console.log(`Chamber:    ${chamber.name} (${chamber.address})`);
    console.log(`Login:      ${email} / ${password}`);
    console.log(`Brand:      Primary: ${primaryColor} | Secondary: ${secondaryColor}`);
    console.log("=======================================================\n");
  } catch (error) {
    console.error("❌ Onboarding failed:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runOnboarding();
