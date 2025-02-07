// API Response interface including success flag, data, optional metadata, error details, and a timestamp.
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: PaginationMeta;
  error?: ApiError;
  timestamp: string;
}

// Interface for pagination metadata.
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Interface for API error details.
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Function to create a success response. Returns the data along with optional pagination metadata.
export function createSuccessResponse<T>(
  data: T,
  meta?: PaginationMeta
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  };
}

// Function to create an error response carrying error code, message, and details.
export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };
}

// Function to create pagination metadata from total items, current page, and limit.
export function creatingPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
