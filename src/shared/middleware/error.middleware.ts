import { ErrorRequestHandler } from "express";
import { AppError } from "../types/error.types";
import { QueryFailedError } from "typeorm";
import { ResponseUtil } from "./response.middleware";

interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next
): void => {
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return void ResponseUtil.error(
      res,
      err.code,
      err.message,
      err.details,
      err.statusCode
    );
  }

  // TypeORM Errors
  if (err instanceof QueryFailedError) {
    // unique constraint violation
    if (err.message.includes("duplicate key")) {
      return void ResponseUtil.error(
        res,
        "DUPLICATE_ENTRY",
        "A record with this value already exists in the database",
        undefined,
        409
      );
    }

    return void ResponseUtil.error(
      res,
      "DATABASE_ERROR",
      "Database operation failed",
      undefined,
      400
    );
  }

  // Unexpected Errors
  const errorResponse = {
    message: "An unexpected error occurred: " + err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  return void ResponseUtil.serverError(res, errorResponse.message);
};
