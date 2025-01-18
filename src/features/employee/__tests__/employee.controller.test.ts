import { Request, Response } from "express";
import { EmployeeController } from "../controller/employee.controller";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";
import { TestDataSource } from "@/app/config/test-database";
import { Employee } from "@/entities/Employee";
import { EmployeeService } from "../service/employee.service";

describe("EmployeeController", () => {
  let employeeController: EmployeeController;
  let employeeService: EmployeeService;
  let testEmployee: Employee;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

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

  beforeAll(async () => {
    employeeService = new EmployeeService();
    employeeService["employeeRepository"] =
      TestDataSource.getRepository(Employee);
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    employeeController = new EmployeeController();
    employeeController["employeeService"] = employeeService;

    testEmployee = await employeeService.createEmployee(mockEmployeeData);
  });

  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.dropDatabase();
      await TestDataSource.destroy();
    }
  });

  describe("createEmployee", () => {
    it("should create employee successfully", async () => {
      const newEmployeeData: CreateEmployeeDto = {
        ...mockEmployeeData,
        email: "jane@example.com",
        sinNumber: "987654321",
      };

      mockRequest = {
        body: newEmployeeData,
      };

      await employeeController.createEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: newEmployeeData.email,
          sinNumber: newEmployeeData.sinNumber,
        })
      );
    });

    it("should return 400 when creating employee with duplicate email", async () => {
      mockRequest = {
        body: mockEmployeeData,
      };

      await employeeController.createEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "CREATE_EMPLOYEE_ERROR",
        })
      );
    });
  });

  describe("getEmployee", () => {
    it("should get employee by id successfully", async () => {
      mockRequest = {
        params: { id: testEmployee.id.toString() },
      };

      await employeeController.getEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: testEmployee.id,
          email: testEmployee.email,
        })
      );
    });

    it("should return 404 for non-existent employee", async () => {
      mockRequest = {
        params: { id: "999999" },
      };

      await employeeController.getEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "EMPLOYEE_NOT_FOUND",
        })
      );
    });
  });

  describe("updateEmployee", () => {
    it("should update employee successfully", async () => {
      const updateData: UpdateEmployeeDto = {
        firstName: "Jane",
        payRate: 30.0,
      };

      mockRequest = {
        params: { id: testEmployee.id.toString() },
        body: updateData,
      };

      await employeeController.updateEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: updateData.firstName,
        })
      );
    });

    it("should return 404 when updating non-existent employee", async () => {
      mockRequest = {
        params: { id: "999999" },
        body: { firstName: "Jane" },
      };

      await employeeController.updateEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "EMPLOYEE_NOT_FOUND",
        })
      );
    });
  });

  describe("deleteEmployee", () => {
    it("should delete employee successfully", async () => {
      mockRequest = {
        params: { id: testEmployee.id.toString() },
      };

      await employeeController.deleteEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should return 404 when deleting non-existent employee", async () => {
      mockRequest = {
        params: { id: "999999" },
      };

      await employeeController.deleteEmployee(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "EMPLOYEE_NOT_FOUND",
        })
      );
    });
  });

  describe("getEmployees", () => {
    beforeEach(async () => {
      await employeeService.createEmployee({
        ...mockEmployeeData,
        email: "jane@example.com",
        sinNumber: "987654321",
        firstName: "Jane",
      });
    });

    it("should return paginated employees", async () => {
      mockRequest = {
        query: {
          page: "1",
          limit: "10",
        },
      };

      await employeeController.getEmployees(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ email: "john@example.com" }),
            expect.objectContaining({ email: "jane@example.com" }),
          ]),
          total: 2,
          page: 1,
          limit: 10,
        })
      );
    });

    it("should filter employees by search term", async () => {
      mockRequest = {
        query: {
          search: "jane",
        },
      };

      await employeeController.getEmployees(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ email: "jane@example.com" }),
          ]),
        })
      );
    });
  });
});
