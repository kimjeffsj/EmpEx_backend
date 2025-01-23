import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export const TestDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: true,
  dropSchema: true,
  logging: false,
  entities: ["src/entities/**/*.ts"],
  extra: {
    timezone: "UTC",
  },
});
