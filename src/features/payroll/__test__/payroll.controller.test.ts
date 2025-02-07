import { Request, Response } from "express";
import { PayrollController } from "../controller/payroll.controller";
import { PayrollService } from "../service/payroll.service";
import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { TestDataSource } from "@/app/config/test-database";
import { createMockResponse } from "@/test/utils/test.utils";

jest.mock("../service/payroll.service");
jest.mock("@/modules/excel/service/excel.service.ts");

describe("PayrollController", () => {
  let payrollController: PayrollController;
  let mockPayrollService: jest.Mocked<PayrollService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  const mockPayPeriod = {
    id: 1,
    startDate: new Date("2024-03-01T00:00:00Z"),
    endDate: new Date("2024-03-15T23:59:59.999Z"),
    periodType: PayPeriodType.FIRST_HALF,
    status: PayPeriodStatus.PROCESSING,
    createdAt: new Date(),
    updatedAt: new Date(),
    payrolls: [],
  };

  beforeEach(() => {
    const mockRes = createMockResponse();
    mockResponse = mockRes.mockResponse;
    jsonSpy = jest.spyOn(mockResponse, "json");
    statusSpy = jest.spyOn(mockResponse, "status");

    mockPayrollService = new PayrollService(
      TestDataSource
    ) as jest.Mocked<PayrollService>;
    payrollController = new PayrollController(TestDataSource);
    payrollController["payrollService"] = mockPayrollService;
  });

  describe("createPayPeriod", () => {
    it("should create pay period successfully", async () => {
      mockPayrollService.getOrCreatePayPeriod.mockResolvedValue(mockPayPeriod);

      mockRequest = {
        body: {
          periodType: PayPeriodType.FIRST_HALF,
          year: 2024,
          month: 3,
        },
      };

      await payrollController.createPayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockPayPeriod,
        timestamp: expect.any(String),
      });
    });

    it("should handle force recalculation", async () => {
      const recalculatedPayPeriod = {
        ...mockPayPeriod,
        id: 2,
      };
      mockPayrollService.getOrCreatePayPeriod.mockResolvedValue(
        recalculatedPayPeriod
      );

      mockRequest = {
        body: {
          periodType: PayPeriodType.FIRST_HALF,
          year: 2024,
          month: 3,
          forceRecalculate: true,
        },
      };

      await payrollController.createPayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: recalculatedPayPeriod,
        timestamp: expect.any(String),
      });
      expect(mockPayrollService.getOrCreatePayPeriod).toHaveBeenCalledWith(
        PayPeriodType.FIRST_HALF,
        2024,
        3,
        { forceRecalculate: true }
      );
    });

    it("should handle ValidationError for invalid period type", async () => {
      mockRequest = {
        body: {
          periodType: "INVALID_TYPE",
          year: 2024,
          month: 3,
        },
      };

      await payrollController.createPayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid period type",
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle ValidationError for invalid year", async () => {
      mockRequest = {
        body: {
          periodType: PayPeriodType.FIRST_HALF,
          year: 2019,
          month: 3,
        },
      };

      await payrollController.createPayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid year",
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle DatabaseError", async () => {
      const dbError = new DatabaseError("Database connection failed");
      mockPayrollService.getOrCreatePayPeriod.mockRejectedValue(dbError);

      mockRequest = {
        body: {
          periodType: PayPeriodType.FIRST_HALF,
          year: 2024,
          month: 3,
        },
      };

      await payrollController.createPayPeriod(
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

  describe("getPayPeriod", () => {
    it("should get pay period successfully", async () => {
      mockPayrollService.getPayPeriodById.mockResolvedValue(mockPayPeriod);

      mockRequest = {
        params: { id: "1" },
      };

      await payrollController.getPayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockPayPeriod,
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("PayPeriod");
      mockPayrollService.getPayPeriodById.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { id: "999" },
      };

      await payrollController.getPayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "PayPeriod not found",
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("getPayPeriods", () => {
    const mockPayPeriodsList = {
      data: [mockPayPeriod],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it("should get pay periods list successfully", async () => {
      mockPayrollService.getPayPeriods.mockResolvedValue(mockPayPeriodsList);

      mockRequest = {
        query: {},
      };

      await payrollController.getPayPeriods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockPayPeriodsList.data,
        meta: {
          page: mockPayPeriodsList.page,
          limit: mockPayPeriodsList.limit,
          total: mockPayPeriodsList.total,
          totalPages: mockPayPeriodsList.totalPages,
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle date filters correctly", async () => {
      mockPayrollService.getPayPeriods.mockResolvedValue(mockPayPeriodsList);

      mockRequest = {
        query: {
          startDate: "2024-03-01",
          endDate: "2024-03-31",
          status: PayPeriodStatus.PROCESSING,
          periodType: PayPeriodType.FIRST_HALF,
        },
      };

      await payrollController.getPayPeriods(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPayrollService.getPayPeriods).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          status: PayPeriodStatus.PROCESSING,
          periodType: PayPeriodType.FIRST_HALF,
        })
      );
    });
  });

  describe("completePayPeriod", () => {
    it("should complete pay period successfully", async () => {
      const completedPayPeriod = {
        ...mockPayPeriod,
        status: PayPeriodStatus.COMPLETED,
      };

      mockPayrollService.completePayPeriod.mockResolvedValue(
        completedPayPeriod
      );

      mockRequest = {
        params: { id: "1" },
      };

      await payrollController.completePayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: completedPayPeriod,
        timestamp: expect.any(String),
      });
    });

    it("should handle ValidationError for already completed period", async () => {
      const validationError = new ValidationError(
        "Pay period is already completed"
      );
      mockPayrollService.completePayPeriod.mockRejectedValue(validationError);

      mockRequest = {
        params: { id: "1" },
      };

      await payrollController.completePayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Pay period is already completed",
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("PayPeriod");
      mockPayrollService.completePayPeriod.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { id: "999" },
      };

      await payrollController.completePayPeriod(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "PayPeriod not found",
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("exportPayrollToExcel", () => {
    it("should export payroll to excel successfully", async () => {
      const mockBuffer = Buffer.from("test");
      mockPayrollService.getPayPeriodById.mockResolvedValue(mockPayPeriod);
      (
        payrollController["excelService"].generatePayrollReport as jest.Mock
      ).mockResolvedValue(mockBuffer);

      mockRequest = {
        params: { id: "1" },
      };

      await payrollController.exportPayrollToExcel(
        mockRequest as Request,
        mockResponse as Response
      );

      // TODO: fix test error, returning undefined
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: true,
        data: mockBuffer,
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("PayPeriod");
      mockPayrollService.getPayPeriodById.mockRejectedValue(notFoundError);

      mockRequest = {
        params: { id: "999" },
      };

      await payrollController.exportPayrollToExcel(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "PayPeriod not found",
        },
        timestamp: expect.any(String),
      });
    });
  });
});
