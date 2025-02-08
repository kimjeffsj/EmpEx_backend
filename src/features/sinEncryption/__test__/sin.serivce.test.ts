import "@/app/config/env";
import { Repository } from "typeorm";
import { TestDataSource } from "@/app/config/test-database";
import { SINService } from "../service/sin.service";
import { EmployeeSIN, SINAccessLevel } from "@/entities/EmployeeSIN";
import { Employee } from "@/entities/Employee";
import { SINAccessLog } from "@/entities/SINAccessLog";
import { User, UserRole } from "@/entities/User";
import { createTestSINRaw, mockSINData } from "@/test/sin.fixture";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/shared/types/error.types";
import { hash } from "bcrypt";
import { createTestEmployeeRaw } from "@/test/\bemployee.fixture";

describe("SINService", () => {
  let sinService: SINService;
  let testEmployee: Employee;
  let testManager: User;
  let sinRepository: Repository<EmployeeSIN>;
  let employeeRepository: Repository<Employee>;
  let userRepository: Repository<User>;
  let sinAccessLogRepository: Repository<SINAccessLog>;

  beforeAll(async () => {
    const requiredEnvVars = ["ENCRYPTION_KEY", "SIN_HASH_SALT"];

    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required test environment variables: ${missing.join(", ")}`
      );
    }

    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }

    sinService = new SINService(TestDataSource);
    sinRepository = TestDataSource.getRepository(EmployeeSIN);
    employeeRepository = TestDataSource.getRepository(Employee);
    userRepository = TestDataSource.getRepository(User);
    sinAccessLogRepository = TestDataSource.getRepository(SINAccessLog);
  });

  beforeEach(async () => {
    // Reset database
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    // Create test employee
    testEmployee = await createTestEmployeeRaw(TestDataSource);

    // Create test manager
    const hashedPassword = await hash("Password123!", 10);
    testManager = await userRepository.save({
      email: "test.manager@test.com",
      password_hash: hashedPassword,
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

  describe("saveSIN", () => {
    it("should save valid SIN number successfully", async () => {
      const sin = await createTestSINRaw(TestDataSource, testEmployee.id);

      expect(sin).toBeDefined();
      expect(sin.employeeId).toBe(testEmployee.id);
      expect(sin.last3).toBe(mockSINData.sinNumber.slice(-3));
      expect(sin.encryptedData).toBeDefined();
      expect(sin.encryptedData.iv).toBeDefined();
      expect(sin.encryptedData.content).toBeDefined();
      expect(sin.encryptedData.authTag).toBeDefined();
      expect(sin.searchHash).toBeDefined();
      expect(sin.accessLevel).toBe(SINAccessLevel.EMPLOYEE);
    });

    it("should throw ValidationError for invalid SIN number", async () => {
      const invalidSIN = "123456789"; // Invalid Luhn
      await expect(
        sinService.saveSIN(testEmployee.id, invalidSIN)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError for non-existent employee", async () => {
      await expect(
        sinService.saveSIN(9999, mockSINData.sinNumber)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError for duplicate SIN", async () => {
      // First save
      await createTestSINRaw(TestDataSource, testEmployee.id);

      // Create another employee and try to save same SIN
      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);
      await expect(
        sinService.saveSIN(anotherEmployee.id, mockSINData.sinNumber)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getSIN", () => {
    let testSIN: EmployeeSIN;

    beforeEach(async () => {
      testSIN = await createTestSINRaw(TestDataSource, testEmployee.id);
    });

    it("should return masked SIN for employee access", async () => {
      const result = await sinService.getSIN(
        testEmployee.id,
        testEmployee.id,
        "VIEW",
        "127.0.0.1"
      );

      const expectedPattern = new RegExp(
        `XXX-XXX-${mockSINData.sinNumber.slice(-3)}`
      );
      expect(result).toMatch(expectedPattern);
    });

    it("should return full SIN for manager access", async () => {
      const result = await sinService.getSIN(
        testManager.id,
        testEmployee.id,
        "ADMIN_ACCESS",
        "127.0.0.1"
      );

      expect(result).toBe(mockSINData.sinNumber);
    });

    it("should throw ForbiddenError for unauthorized access", async () => {
      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);

      await expect(
        sinService.getSIN(
          anotherEmployee.id,
          testEmployee.id,
          "VIEW",
          "127.0.0.1"
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("should properly log access attempt", async () => {
      await sinService.getSIN(
        testManager.id,
        testEmployee.id,
        "ADMIN_ACCESS",
        "127.0.0.1"
      );

      const log = await sinAccessLogRepository.findOne({
        where: {
          userId: testManager.id,
          employeeId: testEmployee.id,
          accessType: "ADMIN_ACCESS",
        },
      });

      expect(log).toBeDefined();
      expect(log?.ipAddress).toBe("127.0.0.1");
      expect(log?.accessedAt).toBeDefined();
    });

    it("should throw NotFoundError for non-existent SIN", async () => {
      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);

      await expect(
        sinService.getSIN(
          testManager.id,
          anotherEmployee.id,
          "ADMIN_ACCESS",
          "127.0.0.1"
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("encryption", () => {
    it("should generate different encrypted values for same SIN", async () => {
      const sin1 = await createTestSINRaw(TestDataSource, testEmployee.id);

      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);
      const sin2 = await sinService.saveSIN(
        anotherEmployee.id,
        mockSINData.sinNumber
      );

      expect(sin1.encryptedData.content).not.toBe(sin2.encryptedData.content);
      expect(sin1.encryptedData.iv).not.toBe(sin2.encryptedData.iv);
      expect(sin1.searchHash).toBe(sin2.searchHash); // Search hash should be same
    });
  });
});
