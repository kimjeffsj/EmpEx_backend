import "reflect-metadata";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { AppDataSource } from "@/app/config/database";
import { specs } from "./app/config/swagger";
import { errorHandler } from "./shared/middleware/error.middleware";

// Routers
import { employeeRouter } from "./features/employee/routes/employee.routes";
import { timesheetRouter } from "./features/timesheet/routes/timesheet.routes";

// Environment variables setup
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(helmet());
app.use(express.json());

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

// Routers
app.use("/api/employees", employeeRouter);
app.use("/api/timesheets", timesheetRouter);

// Error handling middleware
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Database connection
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    // Start server
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
      console.log(
        `API Documentation available at http://localhost:${port}/api-docs`
      );
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
