import { DataSource, Repository } from "typeorm";
import { User, UserRole } from "@/entities/User";
import { compare, hash } from "bcrypt";
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/types/error.types";
import { TokenService } from "./token.service";
import {
  LoginDto,
  AuthResponse,
  CreateEmployeeAccountDto,
  TOKEN_CONFIG,
  TokenPayload,
  UserResponse,
  UpdateUserDto,
} from "@/shared/types/auth.types";
import { Employee } from "@/entities/Employee";
import { EmployeeUser } from "@/entities/EmployeeUser";
import { TokenBlacklist } from "@/entities/TokenBlacklist";
import { verify } from "jsonwebtoken";

export class AuthService {
  private userRepository: Repository<User>;
  private employeeRepository: Repository<Employee>;
  private employeeUserRepository: Repository<EmployeeUser>;
  private tokenService: TokenService;
  private tokenBlacklistRepository: Repository<TokenBlacklist>;

  constructor(private dataSource: DataSource) {
    this.userRepository = this.dataSource.getRepository(User);
    this.employeeRepository = this.dataSource.getRepository(Employee);
    this.employeeUserRepository = this.dataSource.getRepository(EmployeeUser);
    this.tokenBlacklistRepository =
      this.dataSource.getRepository(TokenBlacklist);
    this.tokenService = new TokenService(
      this.tokenBlacklistRepository,
      process.env.JWT_SECRET!,
      process.env.JWT_REFRESH_SECRET!
    );
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: loginDto.email },
        relations: ["employeeUsers"],
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedError("Invalid credentials");
      }

      const isValidPassword = await compare(
        loginDto.password,
        user.password_hash
      );
      if (!isValidPassword) {
        throw new UnauthorizedError("Invalid credentials");
      }

      // Get employeeId if user is an employee
      let employeeId: number | undefined;
      if (user.role === UserRole.EMPLOYEE) {
        const employeeUser = user.employeeUsers[0];
        employeeId = employeeUser?.employeeId;
      }

      // Update last login
      user.last_login = new Date();
      await this.userRepository.save(user);

      const { accessToken, refreshToken } =
        await this.tokenService.generateTokens({
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId,
        });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          employeeId,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new Error("Login failed");
    }
  }

  async refreshToken(oldRefreshToken: string): Promise<AuthResponse> {
    try {
      const tokenResult = await this.tokenService.rotateRefreshToken(
        oldRefreshToken
      );
      const user = await this.userRepository.findOne({
        where: { id: tokenResult.payload.id },
        relations: ["employeeUsers"],
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedError("User not found or inactive");
      }

      return {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          employeeId: tokenResult.payload.employeeId,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new Error("Token refresh failed");
    }
  }

  // Method to create employee account
  async createEmployeeAccount(
    accountData: CreateEmployeeAccountDto
  ): Promise<AuthResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if employee exists
      const employee = await queryRunner.manager.findOne(Employee, {
        where: { id: accountData.employeeId },
      });

      if (!employee) {
        throw new NotFoundError("Employee not found");
      }

      // Check for duplicate email
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: accountData.email },
      });

      if (existingUser) {
        throw new ValidationError("Email already exists");
      }

      // Create user
      const hashedPassword = await hash(accountData.password, 10);
      const user = this.userRepository.create({
        email: accountData.email,
        password_hash: hashedPassword,
        first_name: employee.firstName,
        last_name: employee.lastName,
        role: UserRole.EMPLOYEE,
        is_active: true,
      });

      const savedUser = await queryRunner.manager.save(user);

      // Create employee-user connection
      const employeeUser = this.employeeUserRepository.create({
        userId: savedUser.id,
        employeeId: employee.id,
      });

      await queryRunner.manager.save(employeeUser);

      // Generate tokens
      const tokenResult = await this.tokenService.generateTokens({
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        employeeId: employee.id,
      });

      await queryRunner.commitTransaction();

      return {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          role: savedUser.role,
          employeeId: employee.id,
          isActive: savedUser.is_active,
          createdAt: savedUser.created_at,
          updatedAt: savedUser.updated_at,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new Error("Failed to create employee account");
    } finally {
      await queryRunner.release();
    }
  }

  async updateUser(
    userId: number,
    updateData: UpdateUserDto
  ): Promise<UserResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ["employeeUsers"],
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // If password update is included
      if (updateData.password) {
        if (updateData.password.length < 6) {
          throw new ValidationError(
            "Password must be at least 6 characters long"
          );
        }
        user.password_hash = await hash(updateData.password, 10);
      }

      // Update remaining fields
      if (updateData.firstName) user.first_name = updateData.firstName;
      if (updateData.lastName) user.last_name = updateData.lastName;
      if (typeof updateData.isActive === "boolean")
        user.is_active = updateData.isActive;

      const updatedUser = await this.userRepository.save(user);

      // Get employeeId
      let employeeId: number | undefined;
      if (user.role === UserRole.EMPLOYEE && user.employeeUsers.length > 0) {
        employeeId = user.employeeUsers[0].employeeId;
      }

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        employeeId,
        isActive: updatedUser.is_active,
        lastLogin: updatedUser.last_login,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update user: ${error.message}`);
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const decodedToken = verify(
        token,
        TOKEN_CONFIG.accessToken.secret
      ) as TokenPayload;
      const expiresAt = decodedToken.exp || Math.floor(Date.now() / 1000) + 900; // 15 minutes or token expiration time
      await this.tokenService.blacklistToken(token, expiresAt);
    } catch (error) {
      // Add to blacklist even if token is already expired
      await this.tokenService.blacklistToken(
        token,
        Math.floor(Date.now() / 1000) + 900
      );
    }
  }

  async getUserById(userId: number): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["employeeUsers"],
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get employeeId if the user is an employee
    let employeeId: number | undefined;
    if (user.role === UserRole.EMPLOYEE && user.employeeUsers.length > 0) {
      employeeId = user.employeeUsers[0].employeeId;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      employeeId,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      // Delete all expired tokens based on current time
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const result = await this.tokenBlacklistRepository
        .createQueryBuilder()
        .delete()
        .from(TokenBlacklist)
        .where("expiresAt <= :currentTimestamp", {
          currentTimestamp: new Date(currentTimestamp * 1000),
        })
        .execute();

      console.log(`Cleaned up ${result.affected || 0} expired tokens`);
    } catch (error) {
      console.error("Error during token cleanup:", error);
      throw new DatabaseError("Failed to cleanup expired tokens");
    }
  }
}
