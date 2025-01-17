import "reflect-metadata";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { AppDataSource } from "@/app/config/database";

// Environment variables setup
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors()); // CORS configuration
app.use(helmet()); // Security headers setup
app.use(express.json()); // JSON parsing

// Base route
app.get("/", (req, res) => {
  res.send("EmpEx API");
});

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
