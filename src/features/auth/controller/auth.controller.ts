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

  async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.split(" ")[1];

      if (!userId || !token) {
        throw new UnauthorizedError("User not authenticated");
      }

      await this.authService.logout(userId, token);

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
