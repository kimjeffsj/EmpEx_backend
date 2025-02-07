import { Response } from "express";

// Interface representing the structure of a mocked Express Response object for testing.
export interface MockResponseReturn {
  jsonSpy: jest.Mock;
  statusSpy: jest.Mock;
  sendSpy: jest.Mock;
  mockResponse: Response;
}

// Creates a mocked Express Response object for testing purposes.
export const createMockResponse = (): MockResponseReturn => {
  const jsonSpy = jest.fn();
  const statusSpy = jest.fn().mockReturnThis();
  const sendSpy = jest.fn();

  return {
    jsonSpy,
    statusSpy,
    sendSpy,
    mockResponse: {
      status: statusSpy,
      json: jsonSpy,
      send: sendSpy,
    } as unknown as Response,
  };
};
