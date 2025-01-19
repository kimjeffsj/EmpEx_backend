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

export class TimesheetController {
  private timesheetService: TimesheetService;

  constructor() {
    this.timesheetService = new TimesheetService();
  }

  async createTimesheet(req: Request, res: Response) {
    try {
      const timesheetData: CreateTimesheetDto = req.body;
      const newTimesheet = await this.timesheetService.createTimesheet(
        timesheetData
      );
      res.status(201).json(newTimesheet);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof NotFoundError) {
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
          message: "An unexpected error occurred while creating timesheet.",
        });
      }
    }
  }

  async getTimesheet(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const timesheet = await this.timesheetService.getTimesheetById(id);
      res.json(timesheet);
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
          message: "An unexpected error occurred while fetching timesheet.",
        });
      }
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
      res.json(timesheets);
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
          message: "An unexpected error occurred while fetching timesheets.",
        });
      }
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
      res.json(updatedTimesheet);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof NotFoundError) {
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
          message: "An unexpected error occurred while updating timesheet.",
        });
      }
    }
  }
  async deleteTimesheet(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await this.timesheetService.deleteTimesheet(id);
      res.status(204).send();
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
          message: "An unexpected error occurred while deleting timesheet.",
        });
      }
    }
  }
}
