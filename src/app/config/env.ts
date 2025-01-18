import dotenv from "dotenv";
import path from "path";

export const loadEnv = () => {
  const environment = process.env.NODE_ENV || "development";
  const envPath =
    environment === "test"
      ? path.resolve(process.cwd(), ".env.test")
      : path.resolve(process.cwd(), ".env");

  dotenv.config({ path: envPath });
};

loadEnv();
