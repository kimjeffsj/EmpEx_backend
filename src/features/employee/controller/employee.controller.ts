import {
  CreateEmployeeDto,
  EmployeeFilters,
  EmployeeResponse,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";
import { EmployeeService } from "@/features/employee/service/employee.service";
import { Request, Response } from "express";
import {
  DatabaseError,
  DuplicateError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { DataSource } from "typeorm";
import { ResponseUtil } from "@/shared/middleware/response.middleware";

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor(dataSource: DataSource) {
    this.employeeService = new EmployeeService(dataSource);
  }

  // Create new employee
  async createEmployee(req: Request, res: Response) {
    try {
      const employeeData: CreateEmployeeDto = req.body;
      const newEmployee = await this.employeeService.createEmployee(
        employeeData
      );

      return void ResponseUtil.created(res, newEmployee);
    } catch (error) {
      if (error instanceof ValidationError) {
        return void ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof DuplicateError) {
        return void ResponseUtil.error(
          res,
          error.code,
          error.message,
          undefined,
          409
        );
      }
      if (error instanceof DatabaseError) {
        return void ResponseUtil.serverError(res, error.message);
      }

      return void ResponseUtil.serverError(
        res,
        "An unexpected error occurred while creating employee."
      );
    }
  }

  // Get employee details
  async getEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const employee = await this.employeeService.getEmployeeById(id);

      return void ResponseUtil.success(res, employee);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return void ResponseUtil.notFound(res, error.message);
      }

      return void ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching employee."
      );
    }
  }

  // Get employee list
  async getEmployees(req: Request, res: Response) {
    try {
      const filters: EmployeeFilters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        isResigned: req.query.isResigned === "true",
        sortBy: req.query.sortBy as keyof EmployeeResponse,
        sortOrder: (req.query.sortOrder as "ASC" | "DESC") || "ASC",
      };

      const result = await this.employeeService.getEmployees(filters);
      return void ResponseUtil.success(res, result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return void ResponseUtil.badRequest(res, error.message, error.details);
      }

      return void ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching employees."
      );
    }
  }

  // Update employee information
  async updateEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updateData: UpdateEmployeeDto = req.body;
      const updatedEmployee = await this.employeeService.updateEmployee(
        id,
        updateData
      );

      return void ResponseUtil.success(res, updatedEmployee);
    } catch (error) {
      if (error instanceof ValidationError) {
        return void ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof NotFoundError) {
        return void ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DuplicateError) {
        return void ResponseUtil.error(
          res,
          error.code,
          error.message,
          undefined,
          409
        );
      }

      return void ResponseUtil.serverError(
        res,
        "An unexpected error occurred while updating employee."
      );
    }
  }

  // Delete Employee
  async deleteEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await this.employeeService.deleteEmployee(id);

      return void ResponseUtil.noContent(res);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return void ResponseUtil.notFound(res, error.message);
      }

      return void ResponseUtil.serverError(
        res,
        "An unexpected error occurred while deleting employee."
      );
    }
  }
}
