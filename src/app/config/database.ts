import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

// Database Connection
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: process.env.NODE_ENV === "development", // Set to true only in development environment
  logging: process.env.NODE_ENV === "development",
  entities: ["src/entities/**/*.ts"], // Entity location
  migrations: ["src/migrations/**/*.ts"], // Migration files location
  subscribers: ["src/subscribers/**/*.ts"],
});
