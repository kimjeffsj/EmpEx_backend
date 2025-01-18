import swaggerJsdoc from "swagger-jsdoc";

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
      schemas: {
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
      },
    },
  },
  apis: ["./src/features/employee/routes/*.ts"],
};

export const specs = swaggerJsdoc(options);
