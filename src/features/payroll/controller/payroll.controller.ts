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

export class PayrollController {
  private payrollService: PayrollService;
  private excelService: ExcelService;
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
    this.payrollService = new PayrollService();
    this.excelService = new ExcelService(
      this.payrollService,
      this.employeeService
    );
  }

  // Create or Get Pay Period
  async createPayPeriod(req: Request, res: Response) {
    try {
      const { periodType, year, month } = req.body;

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
        month
      );

      res.status(201).json(payPeriod);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while creating pay period.",
        });
      }
    }
  }

  // Get Pay Period By ID

  async getPayPeriod(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const payPeriod = await this.payrollService.getPayPeriodById(id);
      res.json(payPeriod);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while fetching pay period.",
        });
      }
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
      res.json(payPeriods);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while fetching pay periods.",
        });
      }
    }
  }

  // Calculate Period Payroll
  async calculatePeriodPayroll(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await this.payrollService.calculatePeriodPayroll(id);

      const updatedPayPeriod = await this.payrollService.getPayPeriodById(id);
      res.json(updatedPayPeriod);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while calculating payroll.",
        });
      }
    }
  }

  // Update Pay Period Status
  async updatePayPeriodStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      // Validate Status
      if (!Object.values(PayPeriodStatus).includes(status)) {
        throw new ValidationError("Invalid status");
      }

      const updatedPayPeriod = await this.payrollService.updatePayPeriodStatus(
        id,
        status
      );

      res.json(updatedPayPeriod);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message:
            "An unexpected error occurred while updating pay period status.",
        });
      }
    }
  }

  // Export to Excel
  async exportPayrollToExcel(req: Request, res: Response) {
    try {
      const payPeriodId = parseInt(req.params.id);
      const buffer = await this.excelService.generatePayrollReport(payPeriodId);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=payroll_report_${payPeriodId}.xlsx`
      );

      res.send(buffer);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message:
            "An unexpected error occurred while generating payroll report.",
        });
      }
    }
  }

  // Export T4
  async exportT4BasicInfo(req: Request, res: Response) {
    try {
      const buffer = await this.excelService.generateT4BasicReport();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=t4_basic_info.xlsx"
      );

      res.send(buffer);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while generating T4 report.",
        });
      }
    }
  }
}
