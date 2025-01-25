import { AppDataSource } from "@/app/config/database";
import { EmployeeUser } from "@/entities/EmployeeUser";
import { User, UserRole } from "@/entities/User";
import {
  AuthResponse,
  LoginDto,
  TokenPayload,
} from "@/shared/types/auth.types";
import { UnauthorizedError } from "@/shared/types/error.types";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { sign, verify } from "jsonwebtoken";

@Injectable()
export class AuthService {
  private userRepository: Repository<User>;
  private employeeUserRepository: Repository<EmployeeUser>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.employeeUserRepository = AppDataSource.getRepository(EmployeeUser);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.is_active) {
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
      },
    };
  }

  private async generateTokens(payload: TokenPayload) {
    const accessToken = sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "30m",
    });

    const refreshToken = sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expires: "7d",
    });

    return { accessToken, refreshToken };
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
        },
      };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }
}
