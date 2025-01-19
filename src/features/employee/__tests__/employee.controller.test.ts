import { Request, Response } from "express";
import { EmployeeController } from "../controller/employee.controller";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";

import { EmployeeService } from "../service/employee.service";
import {
  NotFoundError,
  ValidationError,
  DuplicateError,
  DatabaseError,
} from "@/shared/types/error.types";

// EmployeeService Mock
jest.mock("../service/employee.service");

describe("EmployeeController", () => {
  let employeeController: EmployeeController;
  let mockEmployeeService: jest.Mocked<EmployeeService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  const mockEmployeeData: CreateEmployeeDto = {
    firstName: "John",
    lastName: "Doe",
    sinNumber: "123456789",
    email: "john@example.com",
    address: "123 Main St",
    dateOfBirth: new Date("1990-01-01"),
    payRate: 25.0,
    startDate: new Date(),
  };

  const mockEmployee = {
    id: 1,
    ...mockEmployeeData,
    createdAt: new Date(),
    updatedAt: new Date(),
    resignedDate: null,
  };

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnThis();
    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
      send: jest.fn(),
    };

    // EmployeeService mocking
    mockEmployeeService = new EmployeeService() as jest.Mocked<EmployeeService>;
    employeeController = new EmployeeController();
    employeeController["employeeService"] = mockEmployeeService;
  });

  describe("createEmployee", () => {
    it("should create employee successfully", async () => {
      mockEmployeeService.createEmployee.mockResolvedValue(mockEmployee);

      mockRequest = {
        body: mockEmployeeData,
      };

      await employeeController.createEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith(mockEmployee);
    });

    it("should handle ValidationError", async () => {
      const validationError = new ValidationError("Invalid input");
      mockEmployeeService.createEmployee.mockRejectedValue(validationError);

      mockRequest = {
        body: {}, // empty data for validation error
      };

      await employeeController.createEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "VALIDATION_ERROR",
        message: "Invalid input",
      });
    });

    it("should handle DuplicateError", async () => {
      const duplicateError = new DuplicateError("Employee", "email");
      mockEmployeeService.createEmployee.mockRejectedValue(duplicateError);

      mockRequest = {
        body: mockEmployeeData,
      };

      await employeeController.createEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "DUPLICATE_ERROR",
        message: "Employee with this email already exists",
      });
    });

    it("should handle DatabaseError", async () => {
      const dbError = new DatabaseError("Database connection failed");
      mockEmployeeService.createEmployee.mockRejectedValue(dbError);

      mockRequest = {
        body: mockEmployeeData,
      };

      await employeeController.createEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "DATABASE_ERROR",
        message: "Database connection failed",
      });
    });
  });

  describe("getEmployee", () => {
    it("should get employee successfully", async () => {
      mockEmployeeService.getEmployeeById.mockResolvedValue(mockEmployee);

      mockRequest = {
        params: { id: "1" },
      };

      await employeeController.getEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith(mockEmployee);
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Employee");
      mockEmployeeService.getEmployeeById.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { id: "999" },
      };

      await employeeController.getEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    });
  });

  describe("updateEmployee", () => {
    const updateData: UpdateEmployeeDto = {
      firstName: "Jane",
    };

    it("should update employee successfully", async () => {
      const updatedEmployee = { ...mockEmployee, ...updateData };
      mockEmployeeService.updateEmployee.mockResolvedValue(updatedEmployee);

      mockRequest = {
        params: { id: "1" },
        body: updateData,
      };

      await employeeController.updateEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith(updatedEmployee);
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Employee");
      mockEmployeeService.updateEmployee.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { id: "999" },
        body: updateData,
      };

      await employeeController.updateEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    });

    it("should handle DuplicateError", async () => {
      const duplicateError = new DuplicateError("Employee", "email");
      mockEmployeeService.updateEmployee.mockRejectedValue(duplicateError);

      mockRequest = {
        params: { id: "1" },
        body: { email: "existing@example.com" },
      };

      await employeeController.updateEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "DUPLICATE_ERROR",
        message: "Employee with this email already exists",
      });
    });
  });

  describe("deleteEmployee", () => {
    it("should delete employee successfully", async () => {
      mockEmployeeService.deleteEmployee.mockResolvedValue(true);

      mockRequest = {
        params: { id: "1" },
      };

      await employeeController.deleteEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(204);
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Employee");
      mockEmployeeService.deleteEmployee.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { id: "999" },
      };

      await employeeController.deleteEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    });
  });

  describe("getEmployees", () => {
    const mockEmployeesList = {
      data: [mockEmployee],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it("should get employees list successfully", async () => {
      mockEmployeeService.getEmployees.mockResolvedValue(mockEmployeesList);

      mockRequest = {
        query: {},
      };

      await employeeController.getEmployees(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith(mockEmployeesList);
    });

    it("should handle ValidationError for invalid filters", async () => {
      const validationError = new ValidationError(
        "Invalid pagination parameters"
      );
      mockEmployeeService.getEmployees.mockRejectedValue(validationError);

      mockRequest = {
        query: {
          page: "-1",
        },
      };

      await employeeController.getEmployees(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        code: "VALIDATION_ERROR",
        message: "Invalid pagination parameters",
      });
    });
  });
});
