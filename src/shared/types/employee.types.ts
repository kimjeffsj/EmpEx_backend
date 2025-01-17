// DTO for create employee
export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  sinNumber: string;
  address: string;
  email: string;
  dateOfBirth: Date;
  payRate: number;
  startDate: Date;
}

// DTO for update employee
export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  sinNumber?: string;
  address?: string;
  email?: string;
  payRate?: number;
  resignedDate?: Date;
}

// API response type
export interface EmployeeResponse {
  id: number;
  firstName: string;
  lastName: string;
  sinNumber: string;
  address: string;
  email: string;
  dateOfBirth: Date;
  payRate: number;
  resignedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isResigned: boolean;
}

// Employee search filter options
export interface EmployeeFilters {
  isResigned?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof EmployeeResponse;
  sortOrder?: "ASC" | "DESC";
}

// Paginated employee list response
export interface PaginationEmployeeResponse {
  data: EmployeeResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error Response
export interface EmployeeError {
  code: string;
  message: string;
  details?: Record<string, string>;
}
