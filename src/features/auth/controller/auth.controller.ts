import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";
import { TokenService } from "../service/token.service";
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/shared/types/error.types";
import { DataSource } from "typeorm";
import { ResponseUtil } from "@/shared/middleware/response.middleware";
import {
  LoginDto,
  CreateEmployeeAccountDto,
  UpdateUserDto,
} from "@/shared/types/auth.types";
import { TokenBlacklist } from "@/entities/TokenBlacklist";
import { UserRole } from "@/entities/User";

export class AuthController {
  private authService: AuthService;
  private tokenService: TokenService;

  constructor(dataSource: DataSource) {
    this.authService = new AuthService(dataSource);
    this.tokenService = new TokenService(
      dataSource.getRepository(TokenBlacklist),
      process.env.JWT_SECRET!,
      process.env.JWT_REFRESH_SECRET!
    );
  }

  async login(req: Request, res: Response) {
    try {
      const loginDto: LoginDto = req.body;
      const authResponse = await this.authService.login(loginDto);

      // Set HTTP-only cookies
      this.tokenService.setCookies(res, {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      });

      // Send response without sensitive token information
      return ResponseUtil.success(res, {
        user: authResponse.user,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred during login."
      );
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError("No refresh token provided");
      }

      const authResponse = await this.authService.refreshToken(refreshToken);

      // Update cookies with new tokens
      this.tokenService.setCookies(res, {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      });

      return ResponseUtil.success(res, {
        user: authResponse.user,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        this.tokenService.clearCookies(res);
        return ResponseUtil.unauthorized(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while refreshing token."
      );
    }
  }

  async createEmployeeAccount(req: Request, res: Response) {
    try {
      const employeeAccountData: CreateEmployeeAccountDto = req.body;
      const authResponse = await this.authService.createEmployeeAccount(
        employeeAccountData
      );

      this.tokenService.setCookies(res, {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      });

      return ResponseUtil.created(res, {
        user: authResponse.user,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while creating employee account."
      );
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const updateData: UpdateUserDto = req.body;

      // Permission check: Only self or manager can modify
      if (req.user?.id !== userId && req.user?.role !== UserRole.MANAGER) {
        throw new ForbiddenError(
          "You don't have permission to update this user"
        );
      }

      const updatedUser = await this.authService.updateUser(userId, updateData);

      return ResponseUtil.success(res, {
        user: updatedUser,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof ForbiddenError) {
        return ResponseUtil.forbidden(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while updating user."
      );
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const accessToken = req.cookies.accessToken;

      if (accessToken) {
        await this.authService.logout(accessToken);
      }

      this.tokenService.clearCookies(res);

      return ResponseUtil.success(res, {
        code: "LOGOUT_SUCCESS",
        message: "Successfully logged out",
        details: {
          userId: req.user?.id,
          logoutTime: new Date(),
        },
      });
    } catch (error) {
      // Even if an error occurs during logout, delete cookies
      this.tokenService.clearCookies(res);

      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred during logout."
      );
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "User not authenticated");
      }

      const user = await this.authService.getUserById(userId);
      return ResponseUtil.success(res, { user });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while fetching user data."
      );
    }
  }
}
