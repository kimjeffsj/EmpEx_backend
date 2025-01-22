import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import { PayrollStatus } from "@/entities/Payroll";
import { PayrollDocumentStatus } from "@/entities/PayrollDocument";

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
  totalHours: number;
}

export interface UpdatePayrollDto {
  status?: PayrollStatus;
}

// PayrollDocument DTO
export interface CreatePayrollDocumentDto {
  payPeriodId: number;
  excelFilePath?: string;
  pdfFilePath?: string;
  status: PayrollDocumentStatus;
}

export interface UpdatePayrollDocumentDto {
  excelFilePath?: string;
  originalPdfPath?: string;
  status?: PayrollDocumentStatus;
  sentDate?: Date;
  receivedDate?: Date;
}

// EmployeePaystub DTOs
export interface CreateEmployeePaystubDto {
  employeeId: number;
  payrollDocumentId: number;
  filePath: string;
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
  payrolls?: PayrollResponse[];
}

export interface PayrollResponse {
  id: number;
  employeeId: number;
  payPeriodId: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  grossPay: number;
  status: PayrollStatus;
  createAt: Date;
  updatedAt: Date;
}

export interface EmployeePaystubResponse {
  id: number;
  employeeId: number;
  payrollDocumentId: number;
  filePath: string;
  createdAt: Date;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PayrollDocumentResponse {
  id: number;
  payPeriodId: number;
  excelFilePath: string | null;
  originalPdfPath: string | null;
  status: PayrollDocumentStatus;
  sentDate: Date | null;
  receivedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  paystubs?: EmployeePaystubResponse[];
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
