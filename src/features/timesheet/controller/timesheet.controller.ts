import { Request, Response } from "express";
import { TimesheetService } from "../service/timesheet.service";
import {
  CreateTimesheetDto,
  TimesheetFilters,
  UpdateTimesheetDto,
} from "@/shared/types/timesheet.types";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { DataSource } from "typeorm";
import { ResponseUtil } from "@/shared/middleware/response.middleware";

export class TimesheetController {
  private timesheetService: TimesheetService;

  constructor(dataSource: DataSource) {
    this.timesheetService = new TimesheetService(dataSource);
  }

  async createTimesheet(req: Request, res: Response) {
    try {
      const timesheetData: CreateTimesheetDto = req.body;
      const newTimesheet = await this.timesheetService.createTimesheet(
        timesheetData
      );

      return ResponseUtil.created(res, newTimesheet);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while creating timesheet."
      );
    }
  }

  async getTimesheet(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const timesheet = await this.timesheetService.getTimesheetById(id);

      return ResponseUtil.success(res, timesheet);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching timesheet."
      );
    }
  }

  async getTimesheets(req: Request, res: Response) {
    try {
      const filters: TimesheetFilters = {
        employeeId: req.query.employeeId
          ? parseInt(req.query.employeeId as string)
          : undefined,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
      };

      const timesheets = await this.timesheetService.getTimesheets(filters);

      return ResponseUtil.success(res, timesheets.data, {
        page: timesheets.page,
        limit: timesheets.limit,
        total: timesheets.total,
        totalPages: timesheets.totalPages,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching timesheets."
      );
    }
  }

  async updateTimesheet(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updateData: UpdateTimesheetDto = req.body;
      const updatedTimesheet = await this.timesheetService.updateTimesheet(
        id,
        updateData
      );

      return ResponseUtil.success(res, updatedTimesheet);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while updating timesheet."
      );
    }
  }
  async deleteTimesheet(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await this.timesheetService.deleteTimesheet(id);

      return ResponseUtil.noContent(res);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while deleting timesheet."
      );
    }
  }
}
