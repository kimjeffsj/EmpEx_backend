import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";
import { UnauthorizedError, ValidationError } from "@/shared/types/error.types";
import { DatabaseError } from "pg";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
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
}
