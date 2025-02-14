import { UserRole } from "@/entities/User";

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: number; // Only for employees
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateManagerDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateEmployeeAccountDto {
  employeeId: number;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  password?: string;
  isActive?: boolean;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// Token Types
export interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
  employeeId?: number; // Only for employees
  exp?: number;
  iat?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

// Filter Types
export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Paginated Response
export interface PaginatedUserResponse {
  data: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error Types
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface LogoutResponse {
  code: string;
  message: string;
  details?: {
    userId: number;
    logoutTime: Date;
  };
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  payload: TokenPayload;
}

export const TOKEN_CONFIG = {
  accessToken: {
    secret: process.env.JWT_SECRET!,
    expiresIn: "15m",
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: "7d",
  },
} as const;
