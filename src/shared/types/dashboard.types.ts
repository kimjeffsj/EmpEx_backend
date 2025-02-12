import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import { PayrollStatus } from "@/entities/Payroll";

export interface ManagerDashboardStats {
  totalEmployees: number;
  newHires: number;
  resignations: number;
  pendingPayroll: number;
  currentPeriod: {
    id: number;
    startDate: Date;
    endDate: Date;
    periodType: PayPeriodType;
    status: PayPeriodStatus;
    submittedTimesheets: number;
    totalEmployees: number;
    totalHours: number;
    overtimeHours: number;
  };
  timesheetStats: {
    submitted: number;
    pending: number;
    overdue: number;
  };
}

export interface EmployeeDashboardStats {
  timesheet: {
    currentPeriod: {
      id: number;
      startDate: Date;
      endDate: Date;
      status: PayPeriodStatus;
      regularHours: number;
      overtimeHours: number;
      totalHours: number;
      totalPay: number;
    };
    monthlyHours: {
      regularHours: number;
      overtimeHours: number;
      totalHours: number;
    };
  };
  payroll: {
    lastPaystub: {
      periodId: number;
      startDate: Date;
      endDate: Date;
      regularHours: number;
      overtimeHours: number;
      grossPay: number;
      status: PayrollStatus;
    };
  };
}
