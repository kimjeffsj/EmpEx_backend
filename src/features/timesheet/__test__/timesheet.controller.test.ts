import { Request, Response } from "express";
import { TimesheetController } from "../controller/timesheet.controller";
import {
  CreateTimesheetDto,
  UpdateTimesheetDto,
} from "@/shared/types/timesheet.types";
import { TimesheetService } from "../service/timesheet.service";
import { NotFoundError, ValidationError } from "@/shared/types/error.types";
import { Employee } from "@/entities/Employee";
import { Timesheet } from "@/entities/Timesheet";
import { TestDataSource } from "@/app/config/test-database";
import { createMockResponse } from "@/test/utils/test.utils";

jest.mock("../service/timesheet.service");

describe("TimesheetController", () => {
  let timesheetController: TimesheetController;
  let mockTimesheetService: jest.Mocked<TimesheetService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockEmployee: Employee = {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    sinNumber: "123456789",
    email: "john@example.com",
    address: "123 Main St",
    dateOfBirth: new Date("1990-01-01"),
    payRate: 20,
    startDate: new Date(),
    resignedDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Employee;

  const mockTimesheetData: CreateTimesheetDto = {
    employeeId: 1,
    startTime: new Date("2024-03-18T09:00:00"),
    endTime: new Date("2024-03-18T17:00:00"),
    regularHours: 8,
    overtimeHours: 0,
  };

  const mockTimesheet: Timesheet = {
    id: 1,
    employeeId: mockEmployee.id,
    employee: mockEmployee,
    startTime: mockTimesheetData.startTime,
    endTime: mockTimesheetData.endTime,
    regularHours: mockTimesheetData.regularHours,
    overtimeHours: mockTimesheetData.overtimeHours || 0,
    totalHours: 8,
    totalPay: 160,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Timesheet;

  beforeEach(() => {
    const mockRes = createMockResponse();
    mockResponse = mockRes.mockResponse;
    jsonSpy = jest.spyOn(mockResponse, "json");
    statusSpy = jest.spyOn(mockResponse, "status");

    mockTimesheetService = new TimesheetService(
      TestDataSource
    ) as jest.Mocked<TimesheetService>;
    timesheetController = new TimesheetController(TestDataSource);
    timesheetController["timesheetService"] = mockTimesheetService;
  });

  describe("createTimesheet", () => {
    it("should create timesheet successfully", async () => {
      mockTimesheetService.createTimesheet.mockResolvedValue(mockTimesheet);
      mockRequest = { body: mockTimesheetData };

      await timesheetController.createTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockTimesheet,
        timestamp: expect.any(String),
      });
    });

    it("should handle ValidationError", async () => {
      const validationError = new ValidationError("Invalid input");
      mockTimesheetService.createTimesheet.mockRejectedValue(validationError);
      mockRequest = { body: {} };

      await timesheetController.createTimesheet(
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

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Employee");
      mockTimesheetService.createTimesheet.mockRejectedValue(notFoundError);
      mockRequest = { body: mockTimesheetData };

      await timesheetController.createTimesheet(
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

  describe("getTimesheet", () => {
    it("should get timesheet successfully", async () => {
      mockTimesheetService.getTimesheetById.mockResolvedValue(mockTimesheet);
      mockRequest = { params: { id: "1" } };

      await timesheetController.getTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockTimesheet,
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Timesheet");
      mockTimesheetService.getTimesheetById.mockRejectedValue(notFoundError);
      mockRequest = { params: { id: "999" } };

      await timesheetController.getTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Timesheet not found",
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("updateTimesheet", () => {
    const updateData: UpdateTimesheetDto = {
      regularHours: 9,
    };

    it("should update timesheet successfully", async () => {
      const updatedTimesheet = { ...mockTimesheet, ...updateData };
      mockTimesheetService.updateTimesheet.mockResolvedValue(updatedTimesheet);
      mockRequest = { params: { id: "1" }, body: updateData };

      await timesheetController.updateTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: updatedTimesheet,
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Timesheet");
      mockTimesheetService.updateTimesheet.mockRejectedValue(notFoundError);
      mockRequest = { params: { id: "999" }, body: updateData };

      await timesheetController.updateTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Timesheet not found",
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("deleteTimesheet", () => {
    it("should delete timesheet successfully", async () => {
      mockTimesheetService.deleteTimesheet.mockResolvedValue(true);
      mockRequest = { params: { id: "1" } };

      await timesheetController.deleteTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(204);
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Timesheet");
      mockTimesheetService.deleteTimesheet.mockRejectedValue(notFoundError);
      mockRequest = { params: { id: "999" } };

      await timesheetController.deleteTimesheet(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Timesheet not found",
        },
        timestamp: expect.any(String),
      });
    });
  });
});
