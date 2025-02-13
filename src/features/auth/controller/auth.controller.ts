import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";
import {
  DuplicateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/types/error.types";
import { DatabaseError } from "pg";
import { DataSource } from "typeorm";
import { ResponseUtil } from "@/shared/middleware/response.middleware";

export class AuthController {
  private authService: AuthService;

  constructor(dataSource: DataSource) {
    this.authService = new AuthService(dataSource);
  }

  async login(req: Request, res: Response) {
    try {
      const loginDto = req.body;
      const authResponse = await this.authService.login(loginDto);

      // Set HTTP-only cookies
      res.cookie("accessToken", authResponse.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return ResponseUtil.success(res, authResponse);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      if (error instanceof ValidationError) {
        return ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred during login."
      );
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const authResponse = await this.authService.refreshToken(refreshToken);

      return ResponseUtil.success(res, authResponse);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
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
      const employeeAccountData = req.body;
      const authResponse = await this.authService.createEmployeeAccount(
        employeeAccountData
      );

      return ResponseUtil.created(res, authResponse);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DuplicateError) {
        return ResponseUtil.error(
          res,
          error.code,
          error.message,
          undefined,
          409
        );
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
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
      const updateData = req.body;
      const updatedUser = await this.authService.updateUser(userId, updateData);

      return ResponseUtil.success(res, updatedUser);
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.badRequest(res, error.message, error.details);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while updating user."
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
      return ResponseUtil.success(res, user);
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

  async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.split(" ")[1];

      if (!userId || !token) {
        throw new UnauthorizedError("User not authenticated");
      }

      await this.authService.logout(userId, token);

      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return ResponseUtil.success(res, {
        code: "LOGOUT_SUCCESS",
        message: "Successfully logged out",
        details: {
          userId: userId,
          logoutTime: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.serverError(res, error.message);
      }
      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred during logout."
      );
    }
  }
}
