import type { UserRole } from "../../generated/prisma/enums.js";

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  isDemo?: boolean;
}
