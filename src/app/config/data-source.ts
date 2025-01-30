import { AppDataSource } from "./database";
import { TestDataSource } from "./test-database";

export const getDataSource = () => {
  return process.env.NODE_ENV === "test" ? TestDataSource : AppDataSource;
};
