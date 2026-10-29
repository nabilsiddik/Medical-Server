import type { Gender, UserRole, UserStatus } from "../../../generated/prisma/enums.js";

export { UserRole, UserStatus, Gender } from "../../../generated/prisma/enums.js";

export interface ICreateUserInput {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string | undefined;
  address?: string | undefined;
  gender?: Gender | undefined;
  role?: UserRole | undefined;
  age?: number | undefined;
  dateOfBirth?: string | undefined;
  bloodGroup?: string | undefined;
  emergencyContactName?: string | undefined;
  emergencyContactPhone?: string | undefined;
  allergies?: string[] | undefined;
  chronicConditions?: string[] | undefined;
}

export interface IUpdateProfileInput {
  fullName?: string | undefined;
  phoneNumber?: string | undefined;
  address?: string | undefined;
  gender?: Gender | undefined;
  age?: number | undefined;
  dateOfBirth?: string | undefined;
  bloodGroup?: string | undefined;
  emergencyContactName?: string | undefined;
  emergencyContactPhone?: string | undefined;
  allergies?: string[] | undefined;
  chronicConditions?: string[] | undefined;
}

export interface IUserFilterRequest {
  searchTerm?: string | undefined;
  email?: string | undefined;
  role?: UserRole | undefined;
  status?: UserStatus | undefined;
  gender?: Gender | undefined;
}
