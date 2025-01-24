import { AppDataSource } from "@/app/config/database";
import { Employee } from "@/entities/Employee";
import {
  PayPeriod,
  PayPeriodStatus,
  PayPeriodType,
} from "@/entities/PayPeriod";
import { Payroll, PayrollStatus } from "@/entities/Payroll";
import { Timesheet } from "@/entities/Timesheet";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import {
  isValidStatusTransition,
  PaginatedPayPeriodResponse,
  PayPeriodFilters,
  STATUS_TRANSITION_ERRORS,
} from "@/shared/types/payroll.types";
import { Between, Repository } from "typeorm";

interface PayrollCalculation {
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalHours: number;
  grossPay: number;
}

export class PayrollService {
  private payrollRepository: Repository<Payroll>;
  private payPeriodRepository: Repository<PayPeriod>;
  private timesheetRepository: Repository<Timesheet>;
  private employeeRepository: Repository<Employee>;

  constructor() {
    this.payrollRepository = AppDataSource.getRepository(Payroll);
    this.payPeriodRepository = AppDataSource.getRepository(PayPeriod);
    this.timesheetRepository = AppDataSource.getRepository(Timesheet);
    this.employeeRepository = AppDataSource.getRepository(Employee);
  }

  private getUTCDateRange(
    year: number,
    month: number,
    isFirstHalf: boolean
  ): { startDate: Date; endDate: Date } {
    if (isFirstHalf) {
      // Day 1 of the month 00:00:00 UTC
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      // Day 15 of the month 23:59:59.999 UTC
      const endDate = new Date(Date.UTC(year, month - 1, 15, 23, 59, 59, 999));
      return { startDate, endDate };
    } else {
      // Day 16 of the month 00:00:00 UTC
      const startDate = new Date(Date.UTC(year, month - 1, 16, 0, 0, 0));
      // End day of the month 23:59:59.999 UTC
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = new Date(
        Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999)
      );
      return { startDate, endDate };
    }
  }

  // Get or Create pay period
  async getOrCreatePayPeriod(
    periodType: PayPeriodType,
    year: number,
    month: number
  ): Promise<PayPeriod> {
    try {
      const { startDate, endDate } = this.getUTCDateRange(
        year,
        month,
        periodType === PayPeriodType.FIRST_HALF
      );

      // Query for existing pay period
      const existingPeriod = await this.payPeriodRepository.findOne({
        where: {
          startDate: Between(startDate, endDate),
          periodType,
        },
      });

      if (existingPeriod) {
        return existingPeriod;
      }

      // Create period
      const newPeriod = this.payPeriodRepository.create({
        startDate,
        endDate,
        periodType,
        status: PayPeriodStatus.PENDING,
      });

      return await this.payPeriodRepository.save(newPeriod);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(`Error creating pay period: ${error.message}`);
    }
  }

  // Calculate payroll by pay period
  async calculatePeriodPayroll(periodId: number): Promise<void> {
    try {
      const payPeriod = await this.payPeriodRepository.findOne({
        where: { id: periodId },
      });

      if (!payPeriod) {
        throw new NotFoundError("Pay period not found");
      }

      // Validate status
      if (payPeriod.status !== PayPeriodStatus.PENDING) {
        throw new ValidationError("Pay period is not in PENDING");
      }

      // Get timesheets for the period
      const timesheets = await this.timesheetRepository.find({
        where: {
          startTime: Between(payPeriod.startDate, payPeriod.endDate),
        },
        relations: ["employee"],
      });

      // Group timesheets by employee
      const employeeTimesheets = this.groupTimesheetsByEmployee(timesheets);

      // Calculate and save payroll for each employee
      for (const [employeeId, sheets] of employeeTimesheets.entries()) {
        await this.createEmployeePayroll(employeeId, payPeriod.id, sheets);
      }

      // Update pay period status
      await this.updatePayPeriodStatus(periodId, PayPeriodStatus.PROCESSING);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(
        `Error calculating period payroll: ${error.message}`
      );
    }
  }

  // Get pay periods
  async getPayPeriods(
    filters: PayPeriodFilters
  ): Promise<PaginatedPayPeriodResponse> {
    try {
      const {
        startDate,
        endDate,
        status,
        periodType,
        page = 1,
        limit = 10,
      } = filters;

      const queryBuilder = this.payPeriodRepository
        .createQueryBuilder("payPeriod")
        .leftJoinAndSelect("payPeriod.payrolls", "payroll")
        .leftJoinAndSelect("payroll.employee", "employee");

      if (startDate) {
        // Convert to UTC start of day
        const utcStart = new Date(
          Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        queryBuilder.andWhere("payPeriod.startDate >= :startDate", {
          startDate: utcStart,
        });
      }

      if (endDate) {
        // Convert to UTC end of day
        const utcEnd = new Date(
          Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            23,
            59,
            59,
            999
          )
        );
        queryBuilder.andWhere("payPeriod.endDate <= :endDate", {
          endDate: utcEnd,
        });
      }
      if (status) {
        queryBuilder.andWhere("payPeriod.status = :status", { status });
      }

      if (periodType) {
        queryBuilder.andWhere("payPeriod.periodType = :periodType", {
          periodType,
        });
      }

      queryBuilder.orderBy("payPeriod.startDate", "DESC");

      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [raw, total] = await queryBuilder.getManyAndCount();

      const data = raw.map((payPeriod) => ({
        ...payPeriod,
        payrolls: payPeriod.payrolls?.map((p) => ({
          ...p,
          regularHours: Number(p.totalRegularHours) || 0,
          overtimeHours: Number(p.totalOvertimeHours) || 0,
          grossPay: Number(p.grossPay) || 0,
          createAt: p.createdAt,
        })),
      }));

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new DatabaseError(`Error fetching pay periods: ${error.message}`);
    }
  }

  // Update pay period status
  async updatePayPeriodStatus(
    id: number,
    newStatus: PayPeriodStatus
  ): Promise<PayPeriod> {
    try {
      const payPeriod = await this.getPayPeriodById(id);

      if (!payPeriod) {
        throw new NotFoundError("Pay period not found");
      }

      // Check if status transition is valid
      if (!isValidStatusTransition(payPeriod.status, newStatus)) {
        throw new ValidationError(STATUS_TRANSITION_ERRORS[payPeriod.status]);
      }

      payPeriod.status = newStatus;
      return await this.payPeriodRepository.save(payPeriod);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Error updating pay period status: ${error.message}`
      );
    }
  }

  // Get pay period by ID
  async getPayPeriodById(id: number): Promise<PayPeriod> {
    const payPeriod = await this.payPeriodRepository.findOne({
      where: { id },
      relations: ["payrolls", "payrolls.employee"],
    });

    if (!payPeriod) {
      throw new NotFoundError("PayPeriod");
    }

    return payPeriod;
  }

  // Group timesheets by employee
  private groupTimesheetsByEmployee(
    timesheets: Timesheet[]
  ): Map<number, Timesheet[]> {
    return timesheets.reduce((map, timesheet) => {
      const group = map.get(timesheet.employeeId) || [];
      group.push(timesheet);
      map.set(timesheet.employeeId, group);
      return map;
    }, new Map<number, Timesheet[]>());
  }

  // Create employee payroll
  private async createEmployeePayroll(
    employeeId: number,
    payPeriodId: number,
    timesheets: Timesheet[]
  ): Promise<Payroll> {
    const totalRegularHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.regularHours),
      0
    );
    const totalOvertimeHours = timesheets.reduce(
      (sum, ts) => sum + Number(ts.overtimeHours),
      0
    );
    const totalHours = totalRegularHours + totalOvertimeHours * 1.5;
    const employee = timesheets[0].employee;
    const grossPay = totalHours * Number(employee.payRate);

    const payroll = this.payrollRepository.create({
      employeeId,
      payPeriodId,
      totalRegularHours,
      totalOvertimeHours,
      totalHours,
      grossPay,
      status: PayrollStatus.DRAFT,
    });

    return await this.payrollRepository.save(payroll);
  }
}
