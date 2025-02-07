import { DataSource } from "typeorm";
import { SINService } from "../service/sin.service";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { DatabaseError } from "pg";
import { ResponseUtil } from "@/shared/middleware/response.middleware";
import { Request, Response } from "express";
import { CreateSINDto, SINAccessType } from "@/shared/types/sin.types";

export class SINController {
  private sinService: SINService;

  constructor(dataSource: DataSource) {
    this.sinService = new SINService(dataSource);
  }

  // Save new SIN record and send response
  async createSIN(req: Request, res: Response) {
    try {
      const sinData: CreateSINDto = req.body;
      const newSIN = await this.sinService.saveSIN(
        sinData.employeeId,
        sinData.sinNumber
      );

      return ResponseUtil.created(res, newSIN.toPublicView());
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseUtil.validationError(res, error.message, error.details);
      }
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }

      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while saving SIN."
      );
    }
  }

  // Retrieve SIN information and send response
  async getSIN(req: Request<{ employeeId: string }>, res: Response) {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const { accessType } = req.query;
      const requestingUserId = req.user?.id;

      if (!requestingUserId) {
        throw new ForbiddenError("Authentication required");
      }

      const sin = await this.sinService.getSIN(
        requestingUserId,
        employeeId,
        accessType as SINAccessType,
        req.ip
      );

      return ResponseUtil.success(res, { sin });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error instanceof ForbiddenError) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error instanceof DatabaseError) {
        return ResponseUtil.databaseError(res, error.message);
      }

      return ResponseUtil.serverError(
        res,
        "An unexpected error occurred while retrieving SIN."
      );
    }
  }
}
