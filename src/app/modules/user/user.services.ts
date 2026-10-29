import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";
import { envVars } from "../../config/env.config.js";
import { userSearchableFields } from "./user.constants.js";
import { prisma } from "../../../lib/prisma.js";
import calculatePagination, { type IOptions } from "../../utils/paginations.js";
import type { UserWhereInput } from "../../../generated/prisma/models.js";
import type { JWTPayload } from "../../interfaces/index.js";
import {
  UserRole,
  UserStatus,
  Gender,
} from "../../../generated/prisma/enums.js";
import bcrypt from "bcryptjs";
import { generateJwtToken } from "../../utils/jwtToken.js";
import { fileUploader } from "../../utils/fileUploader.js";
import type { SignOptions } from "jsonwebtoken";
import type {
  ICreateUserInput,
  IUpdateProfileInput,
  IUserFilterRequest,
} from "./user.interfaces.js";

// Helper to generate unique Patient ID: PAT-YYYY-XXXX
const generatePatientId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const count = await prisma.patient.count();
  const serial = (count + 1).toString().padStart(4, "0");
  return `PAT-${currentYear}-${serial}`;
};

// Create a new patient user account with automatic login session
const createUserIntoDb = async (
  data: ICreateUserInput,
  file?: Express.Multer.File,
) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: data.email.toLowerCase().trim(),
    },
  });

  if (existingUser) {
    if (existingUser.isDeleted) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `An account with email ${data.email} was previously deactivated. Please contact support.`,
      );
    }
    throw new AppError(
      StatusCodes.CONFLICT,
      `User with email ${data.email} already exists. Please login instead.`,
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    data.password,
    Number(envVars.SALT_ROUND) || 10,
  );

  let profilePhoto: string | undefined = undefined;
  if (file) {
    try {
      const uploadResult = await fileUploader.uploadToCloudinary(file);
      profilePhoto = uploadResult.Location;
    } catch {
      console.warn("Avatar upload failed or skipped, proceeding with registration.");
    }
  }

  const patientId = await generatePatientId();

  // Create User, Patient, and AuthAccount in transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase().trim(),
        phoneNumber: data.phoneNumber || null,
        address: data.address || null,
        gender: data.gender || Gender.MALE,
        profilePhoto: profilePhoto || null,
        role: UserRole.PATIENT,
        isEmailVerified: true, // Seamless instant login on signup
        isPhoneVerified: false,
        status: UserStatus.ACTIVE,
        authAccounts: {
          create: {
            provider: "CREDENTIAL",
            providerAccountId: data.email.toLowerCase().trim(),
            password: hashedPassword,
          },
        },
      },
      include: {
        authAccounts: true,
      },
    });

    const patient = await tx.patient.create({
      data: {
        patientId,
        userId: user.id,
        fullName: data.fullName,
        phone: data.phoneNumber || "",
        email: data.email.toLowerCase().trim(),
        gender: data.gender || Gender.MALE,
        age: data.age || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        bloodGroup: data.bloodGroup || null,
        address: data.address || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        allergies: data.allergies || [],
        chronicConditions: data.chronicConditions || [],
      },
    });

    return { user, patient };
  });

  // Generate tokens for immediate automatic login
  const jwtPayload: JWTPayload = {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
  };

  const accessToken = generateJwtToken(
    jwtPayload,
    envVars.JWT.JWT_ACCESS_SECRET,
    envVars.JWT.JWT_ACCESS_SECRET_EXPIRES_IN as any,
  );

  const refreshToken = generateJwtToken(
    jwtPayload,
    envVars.JWT.JWT_REFRESH_SECRET,
    envVars.JWT.JWT_REFRESH_SECRET_EXPIRES_IN as any,
  );

  return {
    message: "Patient account created successfully and logged in.",
    accessToken,
    refreshToken,
    user: {
      id: result.user.id,
      fullName: result.user.fullName,
      email: result.user.email,
      role: result.user.role,
      status: result.user.status,
      gender: result.user.gender,
      phoneNumber: result.user.phoneNumber,
      profilePhoto: result.user.profilePhoto,
      isEmailVerified: result.user.isEmailVerified,
      createdAt: result.user.createdAt,
    },
    patient: result.patient,
  };
};

// Get all users from db (Doctor / Admin)
const getAllUsers = async (params: IUserFilterRequest, options: IOptions) => {
  const { page, limit, skip, sortOrder, sortBy } = calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: UserWhereInput[] = [];
  andConditions.push({ isDeleted: false });

  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      sortBy && sortOrder
        ? { [sortBy]: sortOrder }
        : { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      profilePhoto: true,
      address: true,
      gender: true,
      role: true,
      status: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      patient: {
        select: {
          id: true,
          patientId: true,
          age: true,
          bloodGroup: true,
        },
      },
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit) || 1,
    },
    data: result,
  };
};

// Get current user profile (Doctor or Patient)
const getMyProfile = async (currentUser: JWTPayload) => {
  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
      isDeleted: false,
    },
    include: {
      patient: {
        include: {
          appointments: {
            take: 5,
            orderBy: { appointmentDate: "desc" },
            include: {
              chamberLocation: true,
              service: true,
            },
          },
          prescriptions: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  let doctorProfile = null;
  if (user.role === UserRole.ADMIN) {
    doctorProfile = await prisma.clinicSetting.findFirst();
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    profilePhoto: user.profilePhoto,
    address: user.address,
    gender: user.gender,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    patient: user.patient,
    doctorProfile,
  };
};

// Get user by id (Doctor / Admin)
const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      patient: true,
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  return user;
};

// Update own profile
const updateMyProfile = async (
  currentUser: JWTPayload,
  data: IUpdateProfileInput,
  file?: Express.Multer.File,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
      isDeleted: false,
    },
    include: { patient: true },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  let profilePhoto = user.profilePhoto;
  if (file) {
    try {
      const uploadResult = await fileUploader.uploadToCloudinary(file);
      profilePhoto = uploadResult.Location;
    } catch {
      console.warn("Avatar upload failed during profile update.");
    }
  }

  // Update User and linked Patient (if patient)
  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: currentUser.id },
      data: {
        fullName: data.fullName ?? user.fullName,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : user.phoneNumber,
        address: data.address !== undefined ? data.address : user.address,
        gender: data.gender !== undefined ? data.gender : user.gender,
        profilePhoto,
      },
    });

    if (user.patient) {
      await tx.patient.update({
        where: { id: user.patient.id },
        data: {
          fullName: data.fullName ?? user.patient.fullName,
          phone: data.phoneNumber !== undefined ? (data.phoneNumber || "") : user.patient.phone,
          address: data.address !== undefined ? data.address : user.patient.address,
          gender: data.gender !== undefined ? data.gender : user.patient.gender,
          age: data.age !== undefined ? data.age : user.patient.age,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : user.patient.dateOfBirth,
          bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : user.patient.bloodGroup,
          emergencyContactName: data.emergencyContactName !== undefined ? data.emergencyContactName : user.patient.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone !== undefined ? data.emergencyContactPhone : user.patient.emergencyContactPhone,
          allergies: data.allergies !== undefined ? data.allergies : user.patient.allergies,
          chronicConditions: data.chronicConditions !== undefined ? data.chronicConditions : user.patient.chronicConditions,
        },
      });
    }

    return u;
  });

  return getMyProfile(currentUser);
};

// Delete own account (Soft delete)
const deleteMyAccount = async (currentUser: JWTPayload) => {
  const user = await prisma.user.findUnique({
    where: {
      id: currentUser.id,
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  return await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      isDeleted: true,
      status: UserStatus.DELETED,
    },
  });
};

// Soft delete user by doctor / admin
const softDeleteUser = async (id: string, currentUser: JWTPayload) => {
  const targetUser = await prisma.user.findUnique({
    where: { id, isDeleted: false },
  });

  if (!targetUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (targetUser.role === UserRole.ADMIN && currentUser.id !== targetUser.id) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Doctor admin accounts cannot be deleted by other users.",
    );
  }

  return await prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      status: UserStatus.DELETED,
    },
  });
};

// Update user status by doctor / admin
const updateUserStatus = async (
  id: string,
  status: UserStatus,
  _currentUser: JWTPayload,
) => {
  const targetUser = await prisma.user.findUnique({
    where: { id, isDeleted: false },
  });

  if (!targetUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  return await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      role: true,
      updatedAt: true,
    },
  });
};

// Update user role (Doctor Admin only)
const updateUserRole = async (
  id: string,
  role: UserRole,
  _currentUser: JWTPayload,
) => {
  const targetUser = await prisma.user.findUnique({
    where: { id, isDeleted: false },
  });

  if (!targetUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  return await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });
};

// Aggregate user stats for doctor
const getUserStats = async (_currentUser?: JWTPayload) => {
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    deletedUsers,
    verifiedUsers,
    admins,
    patients,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false, status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { isDeleted: false, status: UserStatus.BLOCKED } }),
    prisma.user.count({ where: { isDeleted: true } }),
    prisma.user.count({ where: { isDeleted: false, isEmailVerified: true } }),
    prisma.user.count({ where: { isDeleted: false, role: UserRole.ADMIN } }),
    prisma.user.count({ where: { isDeleted: false, role: UserRole.PATIENT } }),
  ]);

  return {
    overview: {
      totalUsers,
      activeUsers,
      blockedUsers,
      deletedUsers,
      verifiedUsers,
      admins,
      patients,
    },
  };
};

export const UserServices = {
  createUserIntoDb,
  getAllUsers,
  getMyProfile,
  getUserById,
  updateMyProfile,
  deleteMyAccount,
  softDeleteUser,
  updateUserStatus,
  updateUserRole,
  getUserStats,
};
