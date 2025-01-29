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

export class AuthController {
  private authService: AuthService;

  constructor(dataSource: DataSource) {
    this.authService = new AuthService(dataSource);
  }

  async login(req: Request, res: Response) {
    try {
      const loginDto = req.body;
      const authResponse = await this.authService.login(loginDto);

      res.json(authResponse);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred during login.",
        });
      }
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const authResponse = await this.authService.refreshToken(refreshToken);

      res.json(authResponse);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while refreshing token.",
        });
      }
    }
  }

  async createEmployeeAccount(req: Request, res: Response) {
    try {
      const employeeAccountData = req.body;
      const authResponse = await this.authService.createEmployeeAccount(
        employeeAccountData
      );

      res.status(201).json(authResponse);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof DuplicateError) {
        res.status(409).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message:
            "An unexpected error occurred while creating employee account.",
        });
      }
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedUser = await this.authService.updateUser(userId, updateData);

      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          code: error.code,
          message: error.message,
        });
      } else if (error instanceof DatabaseError) {
        res.status(500).json({
          code: error.code,
          message: error.message,
        });
      } else {
        res.status(500).json({
          code: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred while updating user.",
        });
      }
    }
  }
}
