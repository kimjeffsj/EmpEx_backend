import { UserRole } from "@/entities/User";

export interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
  employeeId?: number;
  exp?: number;
  iat?: number;
  refreshTokenId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
