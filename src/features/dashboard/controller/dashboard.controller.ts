import { Request, Response } from "express";
import { DashboardService } from "../service/dashboard.service";
import { DataSource } from "typeorm";
import { ResponseUtil } from "@/shared/middleware/response.middleware";
import { DatabaseError, NotFoundError } from "@/shared/types/error.types";

export class DashboardController {
  private dashboardService: DashboardService;

  constructor(dataSource: DataSource) {
    this.dashboardService = new DashboardService(dataSource);
  }

  async getManagerDashboardStats(req: Request, res: Response) {
    try {
      const stats = await this.dashboardService.getManagerDashboardStats();
      return ResponseUtil.success(res, stats);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching dashboard stats."
      );
    }
  }

  async getEmployeeDashboardStats(req: Request, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return ResponseUtil.badRequest(res, "Employee ID is required");
      }

      const stats = await this.dashboardService.getEmployeeDashboardStats(
        employeeId
      );
      return ResponseUtil.success(res, stats);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching employee dashboard stats."
      );
    }
  }
}
