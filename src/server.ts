import "reflect-metadata";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { AppDataSource } from "@/app/config/database";
import { employeeRouter } from "./features/employee/routes/employee.routes";

// Environment variables setup
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(helmet());
app.use(express.json());

// Base route
app.get("/", (req, res) => {
  res.send("EmpEx API");
});

// Routers
app.use("/api/employees", employeeRouter);

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Internal server error",
    });
  }
);

// Database connection and server startup
const startServer = async () => {
  try {
    // Database connection
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    // Start server
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
