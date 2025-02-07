interface StandardResponseShape {
  success: boolean;
  data: any;
  timestamp: string;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// validate a successful response
export const expectSuccessResponse = (
  spy: jest.Mock,
  statusSpy: jest.Mock,
  status: number,
  data: any,
  meta?: PaginationMeta
) => {
  const response: StandardResponseShape = spy.mock.calls[0][0];

  expect(statusSpy).toHaveBeenCalledWith(status);
  expect(response.success).toBe(true);
  expect(response.data).toEqual(data);
  expect(response.timestamp).toBeDefined();
  expect(new Date(response.timestamp).getTime()).not.toBeNaN();

  if (meta) {
    expect(response.meta).toEqual(meta);
  }
};

// validate an error response
export const expectErrorResponse = (
  spy: jest.Mock,
  statusSpy: jest.Mock,
  status: number,
  code: string,
  message: string,
  details?: any
) => {
  const response: StandardResponseShape = spy.mock.calls[0][0];

  expect(statusSpy).toHaveBeenCalledWith(status);
  expect(response.success).toBe(false);
  expect(response.data).toBeNull();
  expect(response.timestamp).toBeDefined();
  expect(new Date(response.timestamp).getTime()).not.toBeNaN();

  expect(response.error).toEqual({
    code,
    message,
    ...(details && { details }),
  });
};

// validate pagination metadata
export const expectPaginationMeta = (meta: any, expected: any) => {
  expect(meta).toEqual({
    page: expected.page,
    limit: expected.limit,
    total: expected.total,
    totalPages: expected.totalPages,
  });
};

// validate HTTP status code and response body
export const expectResponseWithStatus = (
  statusSpy: jest.Mock,
  jsonSpy: jest.Mock,
  status: number,
  data: any
) => {
  expect(statusSpy).toHaveBeenCalledWith(status);
  expect(jsonSpy).toHaveBeenCalledWith(data);
};

// validate 204 No Content Response
export const expectNoContentResponse = (
  statusSpy: jest.Mock,
  sendSpy: jest.Mock
) => {
  expect(statusSpy).toHaveBeenCalledWith(204);
  expect(sendSpy).toHaveBeenCalled();
};
