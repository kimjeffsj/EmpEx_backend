import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { AppError } from "../types/error.types";
import { QueryFailedError } from "typeorm";

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
    res.status(err.statusCode).json(response);
    return;
  }

  // TypeORM Errors
  if (err instanceof QueryFailedError) {
    // unique constraint violation
    if (err.message.includes("duplicate key")) {
      response = {
        code: "DUPLICATE_ENTRY",
        message: "A record with this value already exists in the database",
      };
      res.status(409).json(response);
      return;
    }

    response = {
      code: "DATABASE_ERROR",
      message: "Database operation failed",
    };
    res.status(400).json(response);
    return;
  }

  // Unexpected Errors
  response = {
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred" + err.message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(500).json(response);
  return;
};
