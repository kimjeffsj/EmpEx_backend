import { Request, Response } from "express";
import { PayrollService } from "../service/payroll.service";
import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { PayPeriodFilters } from "@/shared/types/payroll.types";

export class PayrollController {
  private payrollService: PayrollService;

  constructor() {
    this.payrollService = new PayrollService();
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
}
