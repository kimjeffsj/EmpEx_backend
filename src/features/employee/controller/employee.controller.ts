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

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  // Create new employee
  async createEmployee(req: Request, res: Response) {
    try {
      const employeeData: CreateEmployeeDto = req.body;
      const newEmployee = await this.employeeService.createEmployee(
        employeeData
      );
      res.status(201).json(newEmployee);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DuplicateError) {
        res.status(409).json({
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
          message: "An unexpected error occurred while creating employee.",
        });
      }
    }
  }

  // Get employee details
  async getEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const employee = await this.employeeService.getEmployeeById(id);
      res.json(employee);
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
          message: "An unexpected error occurred while fetching employee.",
        });
      }
    }
  }

  // Get employee list
  async getEmployees(req: Request, res: Response) {
    try {
      const filters: EmployeeFilters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        search: req.query.search as string,
        isResigned: req.query.isResigned === "true",
        sortBy: req.query.sortBy as keyof EmployeeResponse,
        sortOrder: (req.query.sortOrder as "ASC" | "DESC") || "ASC",
      };

      const employees = await this.employeeService.getEmployees(filters);
      res.json(employees);
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
          message: "An unexpected error occurred while fetching employees.",
        });
      }
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

      res.json(updatedEmployee);
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
      } else if (error instanceof DuplicateError) {
        res.status(409).json({
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
          message: "An unexpected error occurred while updating employee.",
        });
      }
    }
  }

  // Delete Employee
  async deleteEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await this.employeeService.deleteEmployee(id);

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
          message: "An unexpected error occurred while deleting employee.",
        });
      }
    }
  }
}
