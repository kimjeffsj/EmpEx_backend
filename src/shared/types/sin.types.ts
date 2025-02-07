import { SINAccessLevel } from "@/entities/EmployeeSIN";

// DTOs
export interface CreateSINDto {
  employeeId: number;
  sinNumber: string;
}

export interface UpdateSINDto {
  accessLevel?: SINAccessLevel;
}

// Encrypted SIN data structure
export interface EncryptedSINData {
  iv: string;
  content: string;
  authTag: string;
}

// Response type
export interface SINResponse {
  id: number;
  employeeId: number;
  last3: string;
  accessLevel: SINAccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

// Detailed response type for admin
export interface AdminSINResponse extends SINResponse {
  encryptedData: EncryptedSINData;
  searchHash: string;
}

// SIN lookup/access related
export type SINAccessType = "VIEW" | "ADMIN_ACCESS";

export interface SINAccessLogResponse {
  id: number;
  userId: number;
  employeeId: number;
  accessType: SINAccessType;
  ipAddress: string;
  accessedAt: Date;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Log filter options
export interface SINAccessLogFilters {
  employeeId?: number;
  userId?: number;
  accessType?: SINAccessType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// Paginated log response
export interface PaginatedSINAccessLogResponse {
  data: SINAccessLogResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error response
export interface SINError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// Validation related
export interface SINValidationResult {
  isValid: boolean;
  error?: string;
}

// Search related
export interface SINSearchOptions {
  searchHash?: string;
  employeeId?: number;
  limit?: number;
}

// Service configuration options
export interface SINServiceOptions {
  encryptionAlgorithm?: string;
  hashIterations?: number;
  keyLength?: number;
}

// Security policy settings
export interface SINSecurityPolicy {
  maxAttempts: number;
  lockoutDuration: number;
  minAccessLevel: SINAccessLevel;
  allowedIpRanges?: string[];
}

/**
  Possible updates
  */
// export interface SINEvent {
//   type: "CREATE" | "ACCESS" | "UPDATE";
//   employeeId: number;
//   userId: number;
//   timestamp: Date;
//   details: Record<string, any>;
// }
