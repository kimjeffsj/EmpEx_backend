import { TestDataSource } from "@/app/config/test-database";
import { AuthService } from "../service/auth.service";
import { Repository } from "typeorm";
import { User, UserRole } from "@/entities/User";
import { EmployeeUser } from "@/entities/EmployeeUser";
import { Employee } from "@/entities/Employee";

import {
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/types/error.types";
import {
  CreateEmployeeAccountDto,
  LoginDto,
  UpdateUserDto,
} from "@/shared/types/auth.types";
import { compare, hash } from "bcrypt";
import { createTestEmployeeRaw } from "@/test/\bemployee.fixture";

describe("AuthService", () => {
  let authService: AuthService;
  let testEmployee: Employee;
  let userRepository: Repository<User>;
  let employeeUserRepository: Repository<EmployeeUser>;
  let employeeRepository: Repository<Employee>;

  // Setup before all tests
  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }
    authService = new AuthService(TestDataSource);
    userRepository = TestDataSource.getRepository(User);
    employeeUserRepository = TestDataSource.getRepository(EmployeeUser);
    employeeRepository = TestDataSource.getRepository(Employee);
  });

  // Reset database before each test
  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }
    testEmployee = await createTestEmployeeRaw(TestDataSource);
  });

  // Cleanup after all tests
  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  });

  describe("login", () => {
    const mockLoginData: LoginDto = {
      email: "test@example.com",
      password: "Password123!",
    };

    beforeEach(async () => {
      const hashedPassword = await hash(mockLoginData.password, 10);
      await userRepository.save({
        email: mockLoginData.email,
        password_hash: hashedPassword,
        first_name: "Test",
        last_name: "User",
        role: UserRole.MANAGER,
        is_active: true,
      });
    });

    it("should successfully login with valid credentials", async () => {
      const result = await authService.login(mockLoginData);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(mockLoginData.email);
      expect(result.user.role).toBe(UserRole.MANAGER);
    });

    it("should throw UnauthorizedError with incorrect password", async () => {
      await expect(
        authService.login({
          ...mockLoginData,
          password: "wrongpassword",
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError for inactive user", async () => {
      await userRepository.update(
        { email: mockLoginData.email },
        { is_active: false }
      );

      await expect(authService.login(mockLoginData)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe("createEmployeeAccount", () => {
    const mockAccountData: CreateEmployeeAccountDto = {
      employeeId: 1,
      email: "employee@example.com",
      password: "Employee123!",
    };

    it("should successfully create an employee account", async () => {
      const queryRunner = TestDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const result = await authService.createEmployeeAccount({
          ...mockAccountData,
          employeeId: testEmployee.id,
        });

        expect(result).toBeDefined();
        expect(result.user.email).toBe(mockAccountData.email);
        expect(result.user.role).toBe(UserRole.EMPLOYEE);

        const savedUser = await userRepository.findOne({
          where: { email: mockAccountData.email },
          relations: ["employeeUsers"],
        });

        expect(savedUser).toBeDefined();
        expect(savedUser!.employeeUsers.length).toBeGreaterThan(0);

        const employeeUserLink = await employeeUserRepository.findOne({
          where: { userId: savedUser!.id },
        });
        expect(employeeUserLink).toBeDefined();
        expect(employeeUserLink!.employeeId).toBe(testEmployee.id);

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    });

    it("should throw NotFoundError for non-existent employee", async () => {
      await expect(
        authService.createEmployeeAccount({
          ...mockAccountData,
          employeeId: 9999,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw DuplicateError for duplicate email", async () => {
      // First creation
      await authService.createEmployeeAccount({
        ...mockAccountData,
        employeeId: testEmployee.id,
      });

      const newEmployee = await createTestEmployeeRaw(TestDataSource);

      // Second creation with same email
      await expect(
        authService.createEmployeeAccount({
          ...mockAccountData,
          employeeId: newEmployee.id,
        })
      ).rejects.toThrow(DuplicateError);
    });
  });

  describe("updateUser", () => {
    let testUser: User;
    const updateData: UpdateUserDto = {
      firstName: "Updated",
      lastName: "Name",
      password: "NewPassword123!",
      isActive: true,
    };

    beforeEach(async () => {
      const hashedPassword = await hash("oldpassword", 10);
      testUser = await userRepository.save({
        email: "test@example.com",
        password_hash: hashedPassword,
        first_name: "Test",
        last_name: "User",
        role: UserRole.MANAGER,
        is_active: true,
      });
    });

    it("should successfully update user information", async () => {
      const updatedUser = await authService.updateUser(testUser.id, updateData);

      expect(updatedUser.first_name).toBe(updateData.firstName);
      expect(updatedUser.last_name).toBe(updateData.lastName);
      expect(updatedUser.is_active).toBe(updateData.isActive);

      if (updateData.password) {
        const savedUser = await userRepository.findOneBy({ id: testUser.id });
        const isPasswordValid = await compare(
          updateData.password,
          savedUser!.password_hash
        );
        expect(isPasswordValid).toBe(true);
      }
    });

    it("should throw ValidationError for invalid password", async () => {
      await expect(
        authService.updateUser(testUser.id, {
          ...updateData,
          password: "short",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("logout", () => {
    let testUser: User;
    const mockToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwic3ViIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5fQ.signature";

    beforeEach(async () => {
      const hashedPassword = await hash("password123", 10);
      testUser = await userRepository.save({
        email: "test@example.com",
        password_hash: hashedPassword,
        first_name: "Test",
        last_name: "User",
        role: UserRole.EMPLOYEE,
        is_active: true,
      });
    });

    it("should successfully logout user", async () => {
      await authService.logout(testUser.id, mockToken);

      // Check if the token has been added to the blacklist
      const isBlacklisted = await authService.isTokenBlacklisted(mockToken);
      expect(isBlacklisted).toBe(true);

      // Check if the user's last login time has been updated
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(updatedUser?.last_login).toBeDefined();
    });

    it("should throw ValidationError for invalid token format", async () => {
      await expect(
        authService.logout(testUser.id, "invalid-token")
      ).rejects.toThrow(ValidationError);
    });

    it("should successfully cleanup expired tokens", async () => {
      const expiredToken = await authService["tokenBlacklistRepository"].save({
        token: "expired-token",
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });

      await authService.cleanupExpiredTokens();

      const foundToken = await authService["tokenBlacklistRepository"].findOne({
        where: { id: expiredToken.id },
      });
      expect(foundToken).toBeNull();
    });
  });
});
