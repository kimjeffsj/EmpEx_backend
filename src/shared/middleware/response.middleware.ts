// This middleware attaches utility functions for success and error responses to the Express Response object.

import { NextFunction, Request, Response } from "express";
import {
  createErrorResponse,
  createSuccessResponse,
  PaginationMeta,
} from "../types/response.types";

// Extend Express.Response with custom methods
declare global {
  namespace Express {
    interface Response {
      success<T>(data: T, meta?: PaginationMeta): Response;
      error(code: string, message: string, details?: any): Response;
    }
  }
}

// Middleware to attach response methods to the Response object
export const responseHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Attach a "success" method to send standardized success responses
  res.success = function <T>(data: T, meta?: PaginationMeta): Response {
    return this.json(createSuccessResponse(data, meta));
  };

  // Attach an "error" method to send standardized error responses
  res.error = function (
    code: string,
    message: string,
    details?: any
  ): Response {
    return this.json(createErrorResponse(code, message, details));
  };

  next();
};

export class ResponseUtil {
  // Send a success response with optional pagination meta and a status code (default 200)
  static success<T>(
    res: Response,
    data: T,
    meta?: PaginationMeta,
    status: number = 200
  ): Response {
    return res.status(status).json(createSuccessResponse(data, meta));
  }

  // Send a created response (HTTP status 201)
  static created<T>(res: Response, data: T): Response {
    return this.success(res, data, undefined, 201);
  }

  // Send a no-content response (HTTP status 204)
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  // Send an error response with optional details and a status code (default 400)
  static error(
    res: Response,
    code: string,
    message: string,
    details?: any,
    status: number = 400
  ): Response {
    return res.status(status).json(createErrorResponse(code, message, details));
  }

  // Send a bad request error (HTTP status 400)
  static badRequest(res: Response, message: string, details?: any): Response {
    return this.error(res, "BAD_REQUEST", message, details, 400);
  }

  // Send an unauthorized error (HTTP status 401)
  static unauthorized(
    res: Response,
    message: string = "Unauthorized access"
  ): Response {
    return this.error(res, "UNAUTHORIZED", message, undefined, 401);
  }

  // Send a forbidden error (HTTP status 403)
  static forbidden(
    res: Response,
    message: string = "Access forbidden"
  ): Response {
    return this.error(res, "FORBIDDEN", message, undefined, 403);
  }

  // Send a not found error (HTTP status 404)
  static notFound(
    res: Response,
    message: string = "Resource not found"
  ): Response {
    return this.error(res, "NOT_FOUND", message, undefined, 404);
  }

  // Send a server error (HTTP status 500)
  static serverError(
    res: Response,
    message: string = "Internal server error"
  ): Response {
    return this.error(res, "SERVER_ERROR", message, undefined, 500);
  }
}
