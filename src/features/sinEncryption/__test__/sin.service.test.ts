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

describe("SINService", () => {
  let sinService: SINService;
  let testEmployee: Employee;
  let testUser: User;
  let sinRepository: Repository<EmployeeSIN>;
  let sinAccessLogRepository: Repository<SINAccessLog>;
  let employeeRepository: Repository<Employee>;
  let userRepository: Repository<User>;

  // Valid SIN number example pass Luhn algorithm
  const validSIN = "046454286";

  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }

    sinRepository = TestDataSource.getRepository(EmployeeSIN);
    sinAccessLogRepository = TestDataSource.getRepository(SINAccessLog);
    employeeRepository = TestDataSource.getRepository(Employee);
    userRepository = TestDataSource.getRepository(User);

    sinService = new SINService(TestDataSource);
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    // Create Test employee
    testEmployee = await createTestEmployeeRaw(TestDataSource);

    // Create Test Manager
    testUser = await userRepository.save({
      email: "manager@test.com",
      password_hash: "hash",
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
    it("should successfully save SIN with valid data", async () => {
      const sin = await sinService.saveSIN(testEmployee.id, validSIN);

      expect(sin).toBeDefined();
      expect(sin.employeeId).toBe(testEmployee.id);
      expect(sin.last3).toBe(validSIN.slice(-3));
      expect(sin.encryptedData).toBeDefined();
      expect(sin.searchHash).toBeDefined();
    });

    // ValidationError for invalid SIN number test
    it("should throw ValidationError for invalid SIN number (Luhn algorithm", async () => {
      const invalidSIN = "123456789";

      await expect(
        sinService.saveSIN(testEmployee.id, invalidSIN)
      ).rejects.toThrow(ValidationError);
    });

    // NotFoundError for non-existent employee
    it("should throw NotFoundError for non-existent employee", async () => {
      await expect(sinService.saveSIN(999999, validSIN)).rejects.toThrow(
        NotFoundError
      );
    });

    // ValidationError for duplicate SIN entry test
    it("should throw ValidationError for duplicate SIN", async () => {
      // First save
      await sinService.saveSIN(testEmployee.id, validSIN);

      // Create another employee
      const anotherEmployee = await createTestEmployeeRaw(TestDataSource);

      await expect(
        sinService.saveSIN(anotherEmployee.id, validSIN)
      ).rejects.toThrow(ValidationError);
    });
  });

  // getSIN test
  describe("getSIN", () => {
    beforeEach(async () => {
      // Save test SIN
      await sinService.saveSIN(testEmployee.id, validSIN);
    });

    it("should return masked SIN for employee view", async () => {
      const result = await sinService.getSIN(
        testUser.id,
        testEmployee.id,
        "VIEW",
        "127.0.0.1"
      );

      expect(result).toMatch(/XXX-XXX-\d{3}/);
      expect(result.slice(-3)).toBe(validSIN.slice(-3));
    });

    it("should return full SIN for manager with ADMIN_ACCESS", async () => {
      const result = await sinService.getSIN(
        testUser.id,
        testEmployee.id,
        "ADMIN_ACCESS",
        "127.0.0.1"
      );

      expect(result).toBe(validSIN);
    });

    // NotFoundError for non-existent SIN test
    it("should throw NotFoundError for non-existent SIN", async () => {
      const nonExistentEmployeeId = 999999;

      await expect(
        sinService.getSIN(
          testUser.id,
          nonExistentEmployeeId,
          "VIEW",
          "127.0.0.1"
        )
      ).rejects.toThrow(NotFoundError);
    });

    // ForbiddenError for unauthorized access
    it("should throw ForbiddenError for unauthorized access", async () => {
      // Create employee
      const employeeUser = await userRepository.save({
        email: "employee@test.com",
        password_hash: "hash",
        first_name: "Test",
        last_name: "Employee",
        role: UserRole.EMPLOYEE,
        is_active: true,
      });

      await expect(
        sinService.getSIN(
          employeeUser.id,
          testEmployee.id,
          "ADMIN_ACCESS",
          "127.0.0.1"
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
