import swaggerJsdoc from "swagger-jsdoc";
import { PayPeriodStatus, PayPeriodType } from "@/entities/PayPeriod";
import { PayrollStatus } from "@/entities/Payroll";
import { UserRole } from "@/entities/User";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EmpEx API Documentation",
      version: "1.0.0",
      description: "API documentation for Employee Management System",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // Employee Schema
        Employee: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Employee ID",
            },
            firstName: {
              type: "string",
              description: "First name of the employee",
            },
            lastName: {
              type: "string",
              description: "Last name of the employee",
            },
            sinNumber: {
              type: "string",
              description: "Social Insurance Number",
              pattern: "^\\d{9}$",
            },
            address: {
              type: "string",
              description: "Employee address",
            },
            email: {
              type: "string",
              format: "email",
              description: "Employee email address",
            },
            dateOfBirth: {
              type: "string",
              format: "date",
              description: "Employee date of birth",
            },
            payRate: {
              type: "number",
              format: "float",
              minimum: 17.5,
              description: "Hourly pay rate",
            },
            startDate: {
              type: "string",
              format: "date",
              description: "Employment start date",
            },
            resignedDate: {
              type: "string",
              format: "date",
              nullable: true,
              description: "Employment end date",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Record creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Record update timestamp",
            },
          },
          required: [
            "firstName",
            "lastName",
            "sinNumber",
            "email",
            "dateOfBirth",
            "payRate",
            "startDate",
          ],
        },

        // Timesheet Schema
        Timesheet: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Timesheet ID",
            },
            employeeId: {
              type: "integer",
              description: "Employee ID reference",
            },
            startTime: {
              type: "string",
              format: "date-time",
              description: "Start time of work",
            },
            endTime: {
              type: "string",
              format: "date-time",
              description: "End time of work",
            },
            regularHours: {
              type: "number",
              format: "float",
              description: "Regular working hours",
            },
            overtimeHours: {
              type: "number",
              format: "float",
              description: "Overtime hours",
            },
            totalHours: {
              type: "number",
              format: "float",
              description: "Total hours (regular + overtime)",
            },
            totalPay: {
              type: "number",
              format: "float",
              description: "Total pay amount",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Record creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Record update timestamp",
            },
          },
          required: ["employeeId", "startTime", "endTime", "regularHours"],
        },

        // PayPeriod Schema
        PayPeriod: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Pay period ID",
            },
            startDate: {
              type: "string",
              format: "date",
              description: "Start date of the pay period",
            },
            endDate: {
              type: "string",
              format: "date",
              description: "End date of the pay period",
            },
            periodType: {
              type: "string",
              enum: Object.values(PayPeriodType),
              description: "Type of pay period",
            },
            status: {
              type: "string",
              enum: Object.values(PayPeriodStatus),
              description: "Current status of the pay period",
            },
            payrolls: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Payroll",
              },
              description: "Associated payroll records",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Record creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Record update timestamp",
            },
          },
          required: ["startDate", "endDate", "periodType"],
        },

        // Payroll Schema
        Payroll: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Payroll ID",
            },
            employeeId: {
              type: "integer",
              description: "Employee ID reference",
            },
            payPeriodId: {
              type: "integer",
              description: "Pay period ID reference",
            },
            totalRegularHours: {
              type: "number",
              format: "float",
              description: "Total regular hours",
            },
            totalOvertimeHours: {
              type: "number",
              format: "float",
              description: "Total overtime hours",
            },
            totalHours: {
              type: "number",
              format: "float",
              description: "Total hours (regular + overtime)",
            },
            grossPay: {
              type: "number",
              format: "float",
              description: "Gross pay amount",
            },
            status: {
              type: "string",
              enum: Object.values(PayrollStatus),
              description: "Current status of the payroll",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Record creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Record update timestamp",
            },
          },
          required: ["employeeId", "payPeriodId"],
        },

        // Auth Schemas
        LoginRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password",
            },
          },
          required: ["email", "password"],
        },

        AuthResponse: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              description: "JWT access token",
            },
            refreshToken: {
              type: "string",
              description: "JWT refresh token",
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                  description: "User ID",
                },
                email: {
                  type: "string",
                  format: "email",
                  description: "User email",
                },
                firstName: {
                  type: "string",
                  description: "User first name",
                },
                lastName: {
                  type: "string",
                  description: "User last name",
                },
                role: {
                  type: "string",
                  enum: Object.values(UserRole),
                  description: "User role",
                },
                employeeId: {
                  type: "integer",
                  nullable: true,
                  description: "Associated employee ID for employee users",
                },
              },
            },
          },
        },

        // Error Schema
        Error: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Error code",
            },
            message: {
              type: "string",
              description: "Error message",
            },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  value: { type: "string" },
                  msg: { type: "string" },
                  path: { type: "string" },
                  location: { type: "string" },
                },
              },
            },
          },
        },

        // Common Responses
        PaginatedResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
              },
            },
            total: {
              type: "integer",
              description: "Total number of records",
            },
            page: {
              type: "integer",
              description: "Current page number",
            },
            limit: {
              type: "integer",
              description: "Number of records per page",
            },
            totalPages: {
              type: "integer",
              description: "Total number of pages",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/features/*/routes/*.ts"],
};

export const specs = swaggerJsdoc(options);
