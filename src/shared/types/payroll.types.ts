import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import { PayrollStatus } from "@/entities/Payroll";

// PayPeriod DTO
export interface CreatePayPeriodDto {
  startDate: Date;
  endDate: Date;
  periodType: PayPeriodType;
}

export interface UpdatePayPeriodDto {
  status?: PayPeriodStatus;
}

// Payroll DTO
export interface PayrollCalculationDto {
  employeeId: number;
  regularHours: number;
  overtimeHours: number;
}

export interface UpdatePayrollDto {
  status?: PayrollStatus;
}

// Response Types
export interface PayPeriodResponse {
  id: number;
  startDate: Date;
  endDate: Date;
  periodType: PayPeriodType;
  status: PayPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollResponse {
  id: number;
  employeeId: number;
  payPeriodId: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  grossPay: number;
  createAt: Date;
  updatedAt: Date;
}

// Filter Types
export interface PayPeriodFilters {
  startDate?: Date;
  endDate?: Date;
  status?: PayPeriodStatus;
  periodType?: PayPeriodType;
  page?: number;
  limit?: number;
}

export interface PayrollFilters {
  employeeId?: number;
  payPeriodId?: number;
  status?: PayrollStatus;
  page?: number;
  limit?: number;
}

// Paginated Response Types
export interface PaginatedPayPeriodResponse {
  data: PayPeriodResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedPayrollResponse {
  data: PayrollResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
