import { Request, Response } from "express";
import { PayrollService } from "../service/payroll.service";
import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { PayPeriodFilters } from "@/shared/types/payroll.types";
import { ExcelService } from "@/modules/excel/service/excel.service";
import { EmployeeService } from "@/features/employee/service/employee.service";
import { getPayPeriodCode } from "../../../shared/utils/payPeriodFormatter.utils";
import { DataSource } from "typeorm";
import { ResponseUtil } from "@/shared/middleware/response.middleware";

export class PayrollController {
  private payrollService: PayrollService;
  private excelService: ExcelService;
  private employeeService: EmployeeService;

  constructor(dataSource: DataSource) {
    this.employeeService = new EmployeeService(dataSource);
    this.payrollService = new PayrollService(dataSource);
    this.excelService = new ExcelService(
      this.payrollService,
      this.employeeService
    );
  }

  // Create or Get Pay Period
  async createPayPeriod(req: Request, res: Response) {
    try {
      const { periodType, year, month, forceRecalculate } = req.body;

      // Validate period type
      if (!Object.values(PayPeriodType).includes(periodType)) {
        throw new ValidationError("Invalid period type");
      }

      // Validate year and month
      const currentYear = new Date().getFullYear();
      if (year < 2020 || year > currentYear + 1) {
        throw new ValidationError("Invalid year");
      }
      if (month < 1 || month > 12) {
        throw new ValidationError("Invalid month");
      }

      const payPeriod = await this.payrollService.getOrCreatePayPeriod(
        periodType,
        year,
        month,
        { forceRecalculate: !!forceRecalculate }
      );

      return ResponseUtil.created(res, payPeriod);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while creating pay period."
      );
    }
  }

  // Get Pay Period By ID
  async getPayPeriod(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const payPeriod = await this.payrollService.getPayPeriodById(id);
      return ResponseUtil.success(res, payPeriod);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching pay period."
      );
    }
  }

  // Get Pay Period List
  async getPayPeriods(req: Request, res: Response) {
    try {
      const filters: PayPeriodFilters = {
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        status: req.query.status as PayPeriodStatus,
        periodType: req.query.periodType as PayPeriodType,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
      };

      const payPeriods = await this.payrollService.getPayPeriods(filters);

      return ResponseUtil.success(res, payPeriods.data, {
        page: payPeriods.page,
        limit: payPeriods.limit,
        total: payPeriods.total,
        totalPages: payPeriods.totalPages,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching pay periods."
      );
    }
  }

  // Complete Pay Period
  async completePayPeriod(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const completedPayPeriod = await this.payrollService.completePayPeriod(
        id
      );

      return ResponseUtil.success(res, completedPayPeriod);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while completing pay period."
      );
    }
  }

  // Export to Excel
  async exportPayrollToExcel(req: Request, res: Response) {
    try {
      const payPeriodId = parseInt(req.params.id);

      const payPeriod = await this.payrollService.getPayPeriodById(payPeriodId);
      const periodCode = getPayPeriodCode(
        payPeriod.startDate,
        payPeriod.periodType
      );

      const buffer = await this.excelService.generatePayrollReport(payPeriodId);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=payroll_report_${periodCode}.xlsx`
      );

      return res.send(buffer);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while generating payroll report."
      );
    }
  }

  // Export T4
  async exportT4BasicInfo(req: Request, res: Response) {
    try {
      const currentYear = new Date().getFullYear();
      const buffer = await this.excelService.generateT4BasicReport();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${currentYear}_t4_report.xlsx`
      );

      return res.send(buffer);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while generating T4 report."
      );
    }
  }
}
