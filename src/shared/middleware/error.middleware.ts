import { NextFunction, Request, Response } from "express";
import { AppError } from "../types/error.types";
import { QueryFailedError } from "typeorm";

interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let response: ErrorResponse;

  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    response = err.toJSON();
    return res.status(err.statusCode).json(response);
  }

  // TypeORM Errors
  if (err instanceof QueryFailedError) {
    // unique constraint violation
    if (err.message.includes("duplicate key")) {
      response = {
        code: "DUPLICATE_ENTRY",
        message: "A record with this value already exists in the database",
      };
      return res.status(409).json(response);
    }

    response = {
      code: "DATABASE_ERROR",
      message: "Database operation failed",
    };
    return res.status(400).json(response);
  }

  // Unexpected Errors
  response = {
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred" + err.message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  return res.status(500).json(response);
};
