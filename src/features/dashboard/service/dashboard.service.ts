import {
  DataSource,
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from "typeorm";
import { Employee } from "@/entities/Employee";
import { PayPeriod, PayPeriodStatus } from "@/entities/PayPeriod";
import { Timesheet } from "@/entities/Timesheet";
import { Payroll, PayrollStatus } from "@/entities/Payroll";
import { DatabaseError, NotFoundError } from "@/shared/types/error.types";
import {
  ManagerDashboardStats,
  EmployeeDashboardStats,
} from "@/shared/types/dashboard.types";

export class DashboardService {
  private employeeRepository: Repository<Employee>;
  private payPeriodRepository: Repository<PayPeriod>;
  private timesheetRepository: Repository<Timesheet>;
  private payrollRepository: Repository<Payroll>;

  constructor(private dataSource: DataSource) {
    this.employeeRepository = this.dataSource.getRepository(Employee);
    this.payPeriodRepository = this.dataSource.getRepository(PayPeriod);
    this.timesheetRepository = this.dataSource.getRepository(Timesheet);
    this.payrollRepository = this.dataSource.getRepository(Payroll);
  }

  async getManagerDashboardStats(): Promise<ManagerDashboardStats> {
    try {
      // Fetch basic statistical data
      const [totalEmployees, newHires, resignations] = await Promise.all([
        this.getTotalActiveEmployees(),
        this.getNewHiresCount(),
        this.getResignationsCount(),
      ]);

      // Get current pay period
      const currentPeriod = await this.getCurrentPayPeriod();
      let periodStats = null;
      let pendingPayroll = 0;

      if (currentPeriod) {
        // Calculate timesheet statistics for current period
        const timesheetStats = await this.calculateTimesheetStats(
          currentPeriod.id
        );
        periodStats = {
          id: currentPeriod.id,
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          periodType: currentPeriod.periodType,
          status: currentPeriod.status,
          submittedTimesheets: timesheetStats.submittedTimesheets,
          totalEmployees,
          totalHours: timesheetStats.totalHours,
          overtimeHours: timesheetStats.overtimeHours,
        };
        pendingPayroll = await this.calculatePendingPayroll(currentPeriod.id);
      }

      return {
        totalEmployees,
        newHires,
        resignations,
        pendingPayroll,
        currentPeriod: periodStats,
        timesheetStats: {
          submitted: periodStats?.submittedTimesheets || 0,
          pending: totalEmployees - (periodStats?.submittedTimesheets || 0),
          overdue: currentPeriod
            ? await this.calculateOverdueTimesheets(currentPeriod.id)
            : 0,
        },
      };
    } catch (error) {
      console.error("Error in getManagerStats service:", error);

      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Error fetching manager dashboard stats: ${error.message}`
      );
    }
  }

  async getEmployeeDashboardStats(
    employeeId: number
  ): Promise<EmployeeDashboardStats> {
    try {
      // Validate employee exists
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (!employee) {
        throw new NotFoundError("Employee");
      }

      const [currentPeriodStats, monthlyHours, lastPaystub] = await Promise.all(
        [
          this.getEmployeeCurrentPeriodStats(employeeId),
          this.getEmployeeMonthlyHours(employeeId),
          this.getEmployeeLastPaystub(employeeId),
        ]
      );

      return {
        timesheet: {
          currentPeriod: currentPeriodStats,
          monthlyHours,
        },
        payroll: {
          lastPaystub,
        },
      };
    } catch (error) {
      console.error("Error in getEmployeeStats service:", error);

      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Error fetching employee dashboard stats: ${error.message}`
      );
    }
  }

  private async getCurrentPayPeriod(): Promise<PayPeriod | null> {
    return await this.payPeriodRepository.findOne({
      where: { status: PayPeriodStatus.PROCESSING },
      order: { startDate: "DESC" },
      relations: ["payrolls"],
    });
  }

  private async getTotalActiveEmployees(): Promise<number> {
    return await this.employeeRepository.count({
      where: { resignedDate: null },
    });
  }

  private async getNewHiresCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.employeeRepository.count({
      where: {
        startDate: MoreThanOrEqual(thirtyDaysAgo),
        resignedDate: null,
      },
    });
  }

  private async getResignationsCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.employeeRepository.count({
      where: {
        resignedDate: MoreThanOrEqual(thirtyDaysAgo),
      },
    });
  }

  private async calculateTimesheetStats(payPeriodId: number) {
    const timesheets = await this.timesheetRepository.find({
      where: { payPeriodId: payPeriodId },
    });

    const submittedTimesheets = timesheets.length;
    const totalHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.totalHours),
      0
    );
    const overtimeHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.overtimeHours),
      0
    );

    return {
      submittedTimesheets,
      totalHours,
      overtimeHours,
    };
  }

  private async calculatePendingPayroll(payPeriodId: number): Promise<number> {
    const payrolls = await this.payrollRepository.find({
      where: {
        payPeriodId,
        status: PayrollStatus.DRAFT,
      },
    });

    return payrolls.reduce((sum, payroll) => sum + Number(payroll.grossPay), 0);
  }

  private async calculateOverdueTimesheets(
    payPeriodId: number
  ): Promise<number> {
    const payPeriod = await this.payPeriodRepository.findOne({
      where: { id: payPeriodId },
    });

    if (!payPeriod) {
      throw new NotFoundError("Pay period");
    }

    // Consider timesheet overdue if not submitted within 24 hours of the work day
    const overdueDate = new Date(payPeriod.endDate);
    overdueDate.setDate(overdueDate.getDate() + 1);

    const totalEmployees = await this.getTotalActiveEmployees();
    const submittedCount = await this.timesheetRepository.count({
      where: {
        payPeriodId: payPeriodId,
        createdAt: LessThanOrEqual(overdueDate),
      },
    });

    return totalEmployees - submittedCount;
  }

  private async getEmployeeCurrentPeriodStats(employeeId: number) {
    const currentPeriod = await this.getCurrentPayPeriod();
    if (!currentPeriod) {
      throw new NotFoundError("Active pay period");
    }

    const timesheets = await this.timesheetRepository.find({
      where: {
        employeeId,
        startTime: Between(currentPeriod.startDate, currentPeriod.endDate),
      },
    });

    const regularHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.regularHours),
      0
    );
    const overtimeHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.overtimeHours),
      0
    );
    const totalHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.totalHours),
      0
    );
    const totalPay = timesheets.reduce(
      (sum, ts) => sum + Number(ts.totalPay),
      0
    );

    return {
      id: currentPeriod.id,
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      status: currentPeriod.status,
      regularHours,
      overtimeHours,
      totalHours,
      totalPay,
    };
  }

  private async getEmployeeMonthlyHours(employeeId: number) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const timesheets = await this.timesheetRepository.find({
      where: {
        employeeId,
        startTime: Between(startOfMonth, endOfMonth),
      },
    });

    return {
      regularHours: timesheets.reduce(
        (sum, ts) => sum + Number(ts.regularHours),
        0
      ),
      overtimeHours: timesheets.reduce(
        (sum, ts) => sum + Number(ts.overtimeHours),
        0
      ),
      totalHours: timesheets.reduce(
        (sum, ts) => sum + Number(ts.totalHours),
        0
      ),
    };
  }

  private async getEmployeeLastPaystub(employeeId: number) {
    const lastPayroll = await this.payrollRepository.findOne({
      where: {
        employeeId,
        status: PayrollStatus.COMPLETED,
      },
      relations: ["payPeriod"],
      order: { createdAt: "DESC" },
    });

    if (!lastPayroll) {
      return null;
    }

    return {
      periodId: lastPayroll.payPeriodId,
      startDate: lastPayroll.payPeriod.startDate,
      endDate: lastPayroll.payPeriod.endDate,
      regularHours: lastPayroll.totalRegularHours,
      overtimeHours: lastPayroll.totalOvertimeHours,
      grossPay: lastPayroll.grossPay,
      status: lastPayroll.status,
    };
  }
}
