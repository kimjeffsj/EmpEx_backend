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
import { mockEmployeeData } from "@/test/employee.fixture.ts";
import { TestDataSource } from "@/app/config/test-database";
import { createMockResponse } from "@/test/utils/test.utils";

// EmployeeService Mock
jest.mock("../service/employee.service");

describe("EmployeeController", () => {
  let employeeController: EmployeeController;
  let mockEmployeeService: jest.Mocked<EmployeeService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockEmployee = {
    id: 1,
    ...mockEmployeeData,
    createdAt: new Date(),
    updatedAt: new Date(),
    resignedDate: null,
  };

  beforeEach(() => {
    const mockRes = createMockResponse();
    mockResponse = mockRes.mockResponse;
    jsonSpy = jest.spyOn(mockResponse, "json");
    statusSpy = jest.spyOn(mockResponse, "status");

    mockEmployeeService = new EmployeeService(
      TestDataSource
    ) as jest.Mocked<EmployeeService>;
    employeeController = new EmployeeController(TestDataSource);
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
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockEmployee,
        timestamp: expect.any(String),
      });
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
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
        timestamp: expect.any(String),
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
        success: false,
        data: null,
        error: {
          code: "DUPLICATE_ERROR",
          message: "Employee with this email already exists",
        },
        timestamp: expect.any(String),
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
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: "Database connection failed",
        },
        timestamp: expect.any(String),
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

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockEmployee,
        timestamp: expect.any(String),
      });
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
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Employee not found",
        },
        timestamp: expect.any(String),
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

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: updatedEmployee,
        timestamp: expect.any(String),
      });
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
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Employee not found",
        },
        timestamp: expect.any(String),
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
        success: false,
        data: null,
        error: {
          code: "DUPLICATE_ERROR",
          message: "Employee with this email already exists",
        },
        timestamp: expect.any(String),
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
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Employee not found",
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("getEmployees", () => {
    const mockEmployeesList = {
      data: [
        {
          id: 1,
          ...mockEmployeeData,
          createdAt: new Date(),
          updatedAt: new Date(),
          resignedDate: null,
        },
      ],
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

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockEmployeesList.data,
        meta: {
          page: mockEmployeesList.page,
          limit: mockEmployeesList.limit,
          total: mockEmployeesList.total,
          totalPages: mockEmployeesList.totalPages,
        },
        timestamp: expect.any(String),
      });
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
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid pagination parameters",
        },
        timestamp: expect.any(String),
      });
    });
  });
});
