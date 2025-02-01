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
  DatabaseError,
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/types/error.types";
import { DataSource, LessThan, Repository } from "typeorm";
import { decode, sign, SignOptions, verify } from "jsonwebtoken";
import { compare, hash } from "bcrypt";
import { Employee } from "@/entities/Employee";
import { validatePassword } from "../middleware/validation.middleware";
import { TokenBlacklist } from "@/entities/TokenBlacklist";
import { TOKEN_CONFIG } from "@/shared/types/token.types";

export class AuthService {
  private userRepository: Repository<User>;
  private employeeUserRepository: Repository<EmployeeUser>;
  private employeeRepository: Repository<Employee>;
  private tokenBlacklistRepository: Repository<TokenBlacklist>;

  constructor(private dataSource: DataSource) {
    this.userRepository = this.dataSource.getRepository(User);
    this.employeeUserRepository = this.dataSource.getRepository(EmployeeUser);
    this.employeeRepository = this.dataSource.getRepository(Employee);
    this.tokenBlacklistRepository =
      this.dataSource.getRepository(TokenBlacklist);
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

  private async generateTokens(payload: Omit<TokenPayload, "iat" | "exp">) {
    const accessTokenOptions: SignOptions = {
      expiresIn: Number(TOKEN_CONFIG.accessToken.expiresIn),
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: Number(TOKEN_CONFIG.refreshToken.expiresIn),
    };

    const accessToken = sign(
      payload,
      TOKEN_CONFIG.accessToken.secret,
      accessTokenOptions
    );

    const refreshToken = sign(
      payload,
      TOKEN_CONFIG.refreshToken.secret,
      refreshTokenOptions
    );

    return { accessToken, refreshToken };
  }

  async logout(userId: number, token: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Decode the token to check the expiration time
      const decoded = decode(token) as { exp: number };
      if (!decoded || !decoded.exp) {
        throw new ValidationError("Invalid token format");
      }

      const expiresAt = new Date(decoded.exp * 1000);

      // Add token to blacklist
      const blacklistEntry = this.tokenBlacklistRepository.create({
        token,
        userId,
        expiresAt,
      });

      await queryRunner.manager.save(blacklistEntry);

      // Update user's last logout time
      await queryRunner.manager.update(User, userId, {
        last_login: new Date(),
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError(`Error during logout: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.tokenBlacklistRepository.findOne({
      where: { token },
    });
    return !!blacklistedToken;
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      await this.tokenBlacklistRepository.delete({
        expiresAt: LessThan(new Date()),
      });
    } catch (error) {
      throw new DatabaseError(
        `Error cleaning up expired tokens: ${error.message}`
      );
    }
  }
}
