import { Request, Response } from "express";
import { DashboardController } from "../controller/dashboard.controller";
import { DashboardService } from "../service/dashboard.service";
import { TestDataSource } from "@/app/config/test-database";
import { createMockResponse } from "@/test/utils/test.utils";
import { NotFoundError, DatabaseError } from "@/shared/types/error.types";
import { UserRole } from "@/entities/User";
import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import { TokenPayload } from "@/shared/types/auth.types";

jest.mock("../service/dashboard.service");

interface RequestWithUser extends Request {
  user?: TokenPayload;
}

describe("DashboardController", () => {
  let dashboardController: DashboardController;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockManagerStats = {
    totalEmployees: 10,
    newHires: 2,
    resignations: 1,
    pendingPayroll: 5000,
    currentPeriod: {
      id: 1,
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-03-15"),
      periodType: PayPeriodType.FIRST_HALF,
      status: PayPeriodStatus.PROCESSING,
      submittedTimesheets: 8,
      totalEmployees: 10,
      totalHours: 320,
      overtimeHours: 10,
    },
    timesheetStats: {
      submitted: 8,
      pending: 2,
      overdue: 1,
    },
  };

  const mockEmployeeStats = {
    timesheet: {
      currentPeriod: {
        id: 1,
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-03-15"),
        status: PayPeriodStatus.PROCESSING,
        regularHours: 80,
        overtimeHours: 5,
        totalHours: 85,
        totalPay: 2125,
      },
      monthlyHours: {
        regularHours: 160,
        overtimeHours: 10,
        totalHours: 170,
      },
    },
    payroll: {
      lastPaystub: {
        periodId: 1,
        startDate: new Date("2024-02-16"),
        endDate: new Date("2024-02-29"),
        regularHours: 80,
        overtimeHours: 0,
        grossPay: 2000,
        status: "COMPLETED",
      },
    },
  };

  beforeEach(() => {
    const mockRes = createMockResponse();
    mockResponse = mockRes.mockResponse;
    jsonSpy = mockRes.jsonSpy;
    statusSpy = mockRes.statusSpy;

    mockDashboardService = new DashboardService(
      TestDataSource
    ) as jest.Mocked<DashboardService>;
    dashboardController = new DashboardController(TestDataSource);
    dashboardController["dashboardService"] = mockDashboardService;
  });

  describe("getManagerDashboardStats", () => {
    it("should return manager dashboard stats successfully", async () => {
      mockDashboardService.getManagerDashboardStats.mockResolvedValue(
        mockManagerStats
      );

      mockRequest = {
        user: {
          id: 1,
          email: "manager@test.com",
          role: UserRole.MANAGER,
        },
      };

      await dashboardController.getManagerDashboardStats(
        mockRequest as RequestWithUser,
        mockResponse
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockManagerStats,
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      mockDashboardService.getManagerDashboardStats.mockRejectedValue(
        new NotFoundError("Active pay period")
      );

      mockRequest = {
        user: { id: 1, email: "manager@test.com", role: UserRole.MANAGER },
      };

      await dashboardController.getManagerDashboardStats(
        mockRequest as Request,
        mockResponse
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Active pay period not found",
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle DatabaseError", async () => {
      mockDashboardService.getManagerDashboardStats.mockRejectedValue(
        new DatabaseError("Database connection failed")
      );

      mockRequest = {
        user: {
          id: 1,
          email: "manager@test.com",
          role: UserRole.MANAGER,
        },
      };

      await dashboardController.getManagerDashboardStats(
        mockRequest as Request,
        mockResponse
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

  describe("getEmployeeDashboardStats", () => {
    it("should return employee dashboard stats successfully", async () => {
      mockDashboardService.getEmployeeDashboardStats.mockResolvedValue(
        mockEmployeeStats
      );

      mockRequest = {
        user: {
          id: 1,
          employeeId: 1,
          role: UserRole.EMPLOYEE,
          email: "manager@test.com",
        },
      };

      await dashboardController.getEmployeeDashboardStats(
        mockRequest as Request,
        mockResponse
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockEmployeeStats,
        timestamp: expect.any(String),
      });
    });

    it("should handle missing employeeId", async () => {
      mockRequest = {
        user: { id: 1, email: "manager@test.com", role: UserRole.EMPLOYEE },
      };

      await dashboardController.getEmployeeDashboardStats(
        mockRequest as Request,
        mockResponse
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Employee ID is required",
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      mockDashboardService.getEmployeeDashboardStats.mockRejectedValue(
        new NotFoundError("Employee")
      );

      mockRequest = {
        user: {
          id: 1,
          employeeId: 999,
          email: "manager@test.com",
          role: UserRole.EMPLOYEE,
        },
      };

      await dashboardController.getEmployeeDashboardStats(
        mockRequest as Request,
        mockResponse
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
});
