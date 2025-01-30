import { AppDataSource } from "@/app/config/database";
import { EmployeeUser } from "@/entities/EmployeeUser";
import { User, UserRole } from "@/entities/User";
import {
  AuthResponse,
  CreateEmployeeAccountDto,
  LoginDto,
  TokenPayload,
  UpdateUserDto,
} from "@/shared/types/auth.types";
import {
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/types/error.types";
import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { sign, verify } from "jsonwebtoken";
import { compare, hash } from "bcrypt";
import { Employee } from "@/entities/Employee";
import { validatePassword } from "../middleware/validation.middleware";

@Injectable()
export class AuthService {
  private userRepository: Repository<User>;
  private employeeUserRepository: Repository<EmployeeUser>;
  private employeeRepository: Repository<Employee>;

  constructor(private dataSource: DataSource) {
    this.userRepository = this.dataSource.getRepository(User);
    this.employeeUserRepository = this.dataSource.getRepository(EmployeeUser);
    this.employeeRepository = this.dataSource.getRepository(Employee);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
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

    // Update last login
    user.last_login = new Date();
    await this.userRepository.save(user);

    // Get employeeId if the user is an employee
    let employeeId: number | undefined;
    if (user.role === UserRole.EMPLOYEE) {
      const employeeUser = await this.employeeUserRepository.findOne({
        where: { userId: user.id },
      });
      employeeId = employeeUser?.employeeId;
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId,
    });

    return {
      ...tokens,
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
    };
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    try {
      const decoded = verify(
        token,
        process.env.JWT_REFRESH_SECRET!
      ) as TokenPayload;
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });
      if (!user || !user.is_active) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      const tokens = await this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: decoded.employeeId,
      });

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          employeeId: decoded.employeeId,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async createEmployeeAccount(
    accountData: CreateEmployeeAccountDto
  ): Promise<AuthResponse> {
    const employee = await this.employeeRepository.findOne({
      where: { id: accountData.employeeId },
    });

    if (!employee) {
      throw new NotFoundError("Employee");
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: accountData.email },
    });
    if (existingUser) {
      throw new DuplicateError("User", "email");
    }

    if (!accountData.password || accountData.password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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

      const employeeUser = this.employeeUserRepository.create({
        userId: savedUser.id,
        employeeId: employee.id,
      });

      await queryRunner.manager.save(employeeUser);
      await queryRunner.commitTransaction();

      const tokens = await this.generateTokens({
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        employeeId: employee.id,
      });

      return {
        ...tokens,
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
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateUser(userId: number, updateData: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    if (updateData.password) {
      if (!validatePassword(updateData.password)) {
        throw new ValidationError("Password must meet security requirements");
      }
      user.password_hash = await hash(updateData.password, 10);
    }

    Object.assign(user, {
      first_name: updateData.firstName,
      last_name: updateData.lastName,
      is_active: updateData.isActive,
    });

    return await this.userRepository.save(user);
  }

  private async generateTokens(payload: TokenPayload) {
    const accessToken = sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "30m",
    });

    const refreshToken = sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }
}
