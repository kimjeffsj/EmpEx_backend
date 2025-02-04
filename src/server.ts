import "reflect-metadata";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";

import dotenv from "dotenv";
dotenv.config();

import swaggerUi from "swagger-ui-express";
import { specs } from "./app/config/swagger";
import { errorHandler } from "./shared/middleware/error.middleware";
import schedule from "node-schedule";

// Routers
import { createTimesheetRouter } from "./features/timesheet/routes/timesheet.routes";
import { createPayrollRouter } from "./features/payroll/routes/payroll.routes";
import { createEmployeeRouter } from "./features/employee/routes/employee.routes";
import { createAuthRouter } from "./features/auth/routes/auth.routes";
import { getDataSource } from "./app/config/data-source";
import { validateEnvVariables } from "./shared/\butils/env.validator";
import { AuthService } from "./features/auth/service/auth.service";
import { responseHandler } from "./shared/middleware/response.middleware";

// Environment variables setup

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(responseHandler);
app.use(express.json());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
  })
);

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "EmpEx API Documentation",
  })
);

// Base route
app.get("/", (req, res) => {
  res.send("EmpEx API");
});

// Error handling middleware
app.use(errorHandler);

// Expired token cleanup
const setupTokenCleanup = (dataSource: any) => {
  const authService = new AuthService(dataSource);
  // Run midnight
  schedule.scheduleJob("0 0 * * *", async () => {
    try {
      await authService.cleanupExpiredTokens();
      console.log("Expired tokens cleanup completed successfully");
    } catch (error) {
      console.error("Error during token cleanup:", error);
    }
  });
};

// Database connection and server startup
const startServer = async () => {
  try {
    // Env validation
    validateEnvVariables();

    // Database connection
    const dataSource = getDataSource();
    await dataSource.initialize();
    console.log("Database connected successfully");

    app.use("/api/employees", createEmployeeRouter(dataSource));
    app.use("/api/timesheets", createTimesheetRouter(dataSource));
    app.use("/api/payrolls", createPayrollRouter(dataSource));
    app.use("/api/auth", createAuthRouter(dataSource));

    // Token Cleanup
    setupTokenCleanup(dataSource);

    // Start server
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
      console.log(
        `API Documentation available at http://localhost:${port}/api-docs`
      );
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
