import { Employee } from "@/entities/Employee";
import { SINService } from "../service/sin.service";
import { Repository } from "typeorm";
import { EmployeeSIN } from "@/entities/EmployeeSIN";
import { User, UserRole } from "@/entities/User";
import { SINAccessLog } from "@/entities/SINAccessLog";
import { TestDataSource } from "@/app/config/test-database";
import { createTestEmployeeRaw } from "@/test/\bemployee.fixture";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { mockSINData } from "@/test/sin.fixture";

describe("SINService", () => {
  let sinService: SINService;
  let testEmployee: Employee;
  let testManager: User;

  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }

    sinService = new SINService(TestDataSource);
    sinService["sinRepository"] = TestDataSource.getRepository(EmployeeSIN);
    sinService["employeeRepository"] = TestDataSource.getRepository(Employee);
    sinService["userRepository"] = TestDataSource.getRepository(User);
    sinService["sinAccessLogRepository"] =
      TestDataSource.getRepository(SINAccessLog);
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    // Create Test employee
    testEmployee = await createTestEmployeeRaw(TestDataSource);

    // Create Test Manager
    testManager = await TestDataSource.getRepository(User).save({
      email: "manager@test.com",
      password_hash: "hashedpassword",
      first_name: "Test",
      last_name: "Manager",
      role: UserRole.MANAGER,
      is_active: true,
    });
  });

  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  });

  // Save SIN test
  describe("saveSIN", () => {
    it("should save valid SIN successfully", async () => {
      const result = await sinService.saveSIN(
        testEmployee.id,
        mockSINData.validSIN
      );

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployee.id);
      expect(result.last3).toBe(mockSINData.validSIN.slice(-3));
      expect(result.encryptedData).toBeDefined();
      expect(result.searchHash).toBeDefined();
    });

    // ValidationError for invalid SIN number test
    it("should throw ValidationError for invalid SIN", async () => {
      await expect(
        sinService.saveSIN(testEmployee.id, mockSINData.invalidSIN)
      ).rejects.toThrow(ValidationError);
    });

    // NotFoundError for non-existent employee
    it("should throw NotFoundError for non-existent employee", async () => {
      await expect(
        sinService.saveSIN(999999, mockSINData.validSIN)
      ).rejects.toThrow(NotFoundError);
    });

    // ValidationError for duplicate SIN entry test
    it("should throw ValidationError for duplicate SIN", async () => {
      // First Save
      await sinService.saveSIN(testEmployee.id, mockSINData.validSIN);

      // Second Save
      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);
      await expect(
        sinService.saveSIN(anotherEmployee.id, mockSINData.validSIN)
      ).rejects.toThrow(ValidationError);
    });
  });

  // getSIN test
  describe("getSIN", () => {
    let savedSIN: EmployeeSIN;

    beforeEach(async () => {
      savedSIN = await sinService.saveSIN(
        testEmployee.id,
        mockSINData.validSIN
      );
    });

    it("should return masked SIN for employee view", async () => {
      const result = await sinService.getSIN(
        testEmployee.id,
        testEmployee.id,
        "VIEW",
        "127.0.0.1"
      );

      expect(result).toMatch(/XXX-XXX-\d{3}/);
      expect(result.slice(-3)).toBe(mockSINData.validSIN.slice(-3));
    });

    it("should return full SIN for manager with ADMIN_ACCESS", async () => {
      const result = await sinService.getSIN(
        testManager.id,
        testEmployee.id,
        "ADMIN_ACCESS",
        "127.0.0.1"
      );

      expect(result).toBe(mockSINData.validSIN);
    });

    // ForbiddenError for unauthorized access
    it("should throw ForbiddenError for unauthorized access", async () => {
      // Create another employee
      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);

      await expect(
        sinService.getSIN(
          anotherEmployee.id,
          testEmployee.id,
          "ADMIN_ACCESS",
          "127.0.0.1"
        )
      ).rejects.toThrow(ForbiddenError);
    });

    // NotFoundError for non-existent SIN test
    it("should throw NotFoundError for non-existent SIN", async () => {
      const nonExistentEmployeeId = 999999;

      await expect(
        sinService.getSIN(
          testManager.id,
          nonExistentEmployeeId,
          "VIEW",
          "127.0.0.1"
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
