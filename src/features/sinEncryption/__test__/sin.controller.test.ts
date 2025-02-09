import { createMockResponse } from "@/test/utils/test.utils";
import { SINController } from "../controller/sin.controller";
import { SINService } from "../service/sin.service";
import { TestDataSource } from "@/app/config/test-database";
import { Response, Request } from "express";
import { SINAccessLevel } from "@/entities/EmployeeSIN";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import {
  expectErrorResponse,
  expectSuccessResponse,
} from "@/test/helpers/response.helper";

jest.mock("../service/sin.service.ts");

describe("SINController", () => {
  let sinController: SINController;
  let mockSINService: jest.Mocked<SINService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    const mockRes = createMockResponse();
    mockResponse = mockRes.mockResponse;
    jsonSpy = jest.spyOn(mockResponse, "json");
    statusSpy = jest.spyOn(mockResponse, "status");

    mockSINService = new SINService(TestDataSource) as jest.Mocked<SINService>;
    sinController = new SINController(TestDataSource);
    sinController["sinService"] = mockSINService;
  });

  describe("createSIN", () => {
    const mockSINData = {
      employeeId: 1,
      sinNumber: "728492129",
    };

    const mockSINResponse = {
      id: 1,
      employeeId: 1,
      last3: "129",
      accessLevel: SINAccessLevel.EMPLOYEE,
      createdAt: new Date(),
      updatedAt: new Date(),
      toPublicView: () => ({
        id: 1,
        employeeId: 1,
        last3: "129",
        accessLevel: SINAccessLevel.EMPLOYEE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    it("should handle ValidationError", async () => {
      const validationError = new ValidationError("Invalid SIN format");
      mockSINService.saveSIN.mockRejectedValue(validationError);
      mockRequest = { body: mockSINData };

      await sinController.createSIN(
        mockRequest as Request,
        mockResponse as Response
      );

      expectErrorResponse(
        jsonSpy,
        statusSpy,
        400,
        "VALIDATION_ERROR",
        "Invalid SIN format"
      );
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("Employee");
      mockSINService.saveSIN.mockRejectedValue(notFoundError);
      mockRequest = { body: mockSINData };

      await sinController.createSIN(
        mockRequest as Request,
        mockResponse as Response
      );

      expectErrorResponse(
        jsonSpy,
        statusSpy,
        404,
        "NOT_FOUND",
        "Employee not found"
      );
    });
  });

  describe("getSIN", () => {
    const mockUser = {
      id: 1,
      role: "MANAGER",
    };

    it("should get SIN successfully", async () => {
      const mockSIN = "123-456-789";
      mockSINService.getSIN.mockResolvedValue(mockSIN);
      mockRequest = {
        params: { employeeId: "1" },
        query: { accessType: "VIEW" },
        ip: "127.0.0.1",
        user: mockUser,
      };

      await sinController.getSIN(
        mockRequest as Request,
        mockResponse as Response
      );

      expectSuccessResponse(jsonSpy, statusSpy, 200, { sin: mockSIN });
    });

    it("should handle unauthorized access", async () => {
      mockRequest = {
        params: { employeeId: "1" },
        query: { accessType: "VIEW" },
        ip: "127.0.0.1",
        user: undefined,
      };

      await sinController.getSIN(
        mockRequest as Request,
        mockResponse as Response
      );

      expectErrorResponse(
        jsonSpy,
        statusSpy,
        403,
        "FORBIDDEN",
        "Authentication required"
      );
    });

    it("should handle ForbiddenError", async () => {
      const forbiddenError = new ForbiddenError("Insufficient permissions");
      mockSINService.getSIN.mockRejectedValue(forbiddenError);
      mockRequest = {
        params: { employeeId: "1" },
        query: { accessType: "ADMIN_ACCESS" },
        ip: "127.0.0.1",
        user: { ...mockUser, role: "EMPLOYEE" },
      };

      await sinController.getSIN(
        mockRequest as Request,
        mockResponse as Response
      );

      expectErrorResponse(
        jsonSpy,
        statusSpy,
        403,
        "FORBIDDEN",
        "Insufficient permissions"
      );
    });

    it("should handle NotFoundError", async () => {
      const notFoundError = new NotFoundError("SIN");
      mockSINService.getSIN.mockRejectedValue(notFoundError);
      mockRequest = {
        params: { employeeId: "999" },
        query: { accessType: "VIEW" },
        ip: "127.0.0.1",
        user: mockUser,
      };

      await sinController.getSIN(
        mockRequest as Request,
        mockResponse as Response
      );

      expectErrorResponse(
        jsonSpy,
        statusSpy,
        404,
        "NOT_FOUND",
        "SIN not found"
      );
    });
  });
});
