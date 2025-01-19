export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "AppError";

    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field: string) {
    super(
      409,
      "DUPLICATE_ERROR",
      `${resource} with this ${field} already exists`
    );
    this.name = "DuplicateError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, "DATABASE_ERROR", message);
    this.name = "DatabaseError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}
