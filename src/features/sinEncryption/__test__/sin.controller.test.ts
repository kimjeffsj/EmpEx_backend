import { Request, Response } from "express";
import { SINController } from "../controller/sin.controller";
import { SINService } from "../service/sin.service";
import { TestDataSource } from "@/app/config/test-database";
import { createMockResponse } from "@/test/utils/test.utils";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/shared/types/error.types";
import { Employee } from "@/entities/Employee";
import { UserRole } from "@/entities/User";
import { createTestEmployeeRaw } from "@/test/\bemployee.fixture";
import { mockSINData } from "@/test/sin.fixture";

jest.mock("../service/sin.service");

describe("SINController", () => {
  let sinController: SINController;
  let mockSinService: jest.Mocked<SINService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;
  let testEmployee: Employee;

  beforeEach(async () => {
    const mockRes = createMockResponse();
    mockResponse = mockRes.mockResponse;
    jsonSpy = mockRes.jsonSpy;
    statusSpy = mockRes.statusSpy;

    mockSinService = new SINService(TestDataSource) as jest.Mocked<SINService>;
    sinController = new SINController(TestDataSource);
    sinController["sinService"] = mockSinService;

    testEmployee = await createTestEmployeeRaw(TestDataSource);
  });

  describe("createSIN", () => {
    it("should create SIN successfully", async () => {
      const mockSinResponse = {
        id: 1,
        employeeId: testEmployee.id,
        last3: mockSINData.validSIN.slice(-3),
        toPublicView: () => ({
          id: 1,
          employeeId: testEmployee.id,
          last3: mockSINData.validSIN.slice(-3),
        }),
      };

      mockSinService.saveSIN.mockResolvedValue(mockSinResponse);

      mockRequest = {
        body: {
          employeeId: testEmployee.id,
          sinNumber: mockSINData.validSIN,
        },
      };

      await sinController.createSIN(mockRequest as Request, mockResponse);

      expect(mockSinService.saveSIN).toHaveBeenCalledWith(
        testEmployee.id,
        mockSINData.validSIN
      );
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockSinResponse.toPublicView(),
        timestamp: expect.any(String),
      });
    });

    it("should handle ValidationError", async () => {
      mockSinService.saveSIN.mockRejectedValue(
        new ValidationError("Invalid SIN format")
      );

      mockRequest = {
        body: {
          employeeId: testEmployee.id,
          sinNumber: mockSINData.invalidSIN,
        },
      };

      await sinController.createSIN(mockRequest as Request, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid SIN format",
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle NotFoundError", async () => {
      mockSinService.saveSIN.mockRejectedValue(new NotFoundError("Employee"));

      mockRequest = {
        body: {
          employeeId: 999999,
          sinNumber: mockSINData.validSIN,
        },
      };

      await sinController.createSIN(mockRequest as Request, mockResponse);

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

  describe("getSIN", () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      role: UserRole.MANAGER,
    };

    it("should get SIN successfully", async () => {
      mockSinService.getSIN.mockResolvedValue(mockSINData.validSIN);

      mockRequest = {
        params: { employeeId: testEmployee.id.toString() },
        query: { accessType: "VIEW" },
        ip: "127.0.0.1",
        user: mockUser,
      };

      await sinController.getSIN(mockRequest as Request, mockResponse);

      expect(mockSinService.getSIN).toHaveBeenCalledWith(
        mockUser.id,
        testEmployee.id,
        "VIEW",
        "127.0.0.1"
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: { sin: mockSINData.validSIN },
        timestamp: expect.any(String),
      });
    });

    it("should handle ForbiddenError", async () => {
      mockSinService.getSIN.mockRejectedValue(
        new ForbiddenError("Insufficient permissions")
      );

      mockRequest = {
        params: { employeeId: testEmployee.id.toString() },
        query: { accessType: "ADMIN_ACCESS" },
        ip: "127.0.0.1",
        user: { ...mockUser, role: UserRole.EMPLOYEE },
      };

      await sinController.getSIN(mockRequest as Request, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
        timestamp: expect.any(String),
      });
    });
  });
});
