export interface ExcelGenerateOptions {
  sheetName: string;
  fileName: string;
}

export interface PayrollReportData {
  employeeId: number;
  lastName: string;
  firstName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  payRate: number;
  grossPay: number;
}

export interface T4BasicInfoData {
  employeeId: number;
  lastName: string;
  firstName: string;
  sinNumber: string;
  address: string;
  dateOfBirth: Date;
  status: "Active" | "Resigned";
  resignedDate: Date | null;
}
