import {
  CreateEmployeeDto,
  EmployeeFilters,
  EmployeeResponse,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";
import { EmployeeService } from "@/features/employee/service/employee.service";
import { Request, Response } from "express";

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
      res.status(400).json({
        code: "CREATE_EMPLOYEE_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while creating employee.",
      });
    }
  }

  // Get employee details
  async getEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const employee = await this.employeeService.getEmployeeById(id);

      if (!employee) {
        return res.status(404).json({
          code: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found.",
        });
      }

      res.json(employee);
    } catch (error) {
      res.status(500).json({
        code: "GET_EMPLOYEE_ERROR",
        message: "An error occurred while fetching employee information.",
      });
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
      res.status(500).json({
        code: "GET_EMPLOYEES_ERROR",
        message: "An error occurred while fetching employee list.",
      });
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

      if (!updatedEmployee) {
        return res.status(404).json({
          code: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        });
      }

      res.json(updatedEmployee);
    } catch (error) {
      res.status(400).json({
        code: "UPDATE_EMPLOYEE_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while updating employee information.",
      });
    }
  }

  // Delete Employee
  async deleteEmployee(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await this.employeeService.deleteEmployee(id);

      if (!deleted) {
        return res.status(404).json({
          code: "EMPLOYEE_NOT_FOUND",
          message: "Employee not found",
        });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        code: "DELETE_EMPLOYEE_ERROR",
        message: "An error occurred while deleting employee.",
      });
    }
  }
}
