import { DataSource } from "typeorm";
import { AppDataSource } from "./database";
import { TestDataSource } from "./test-database";

export type DataSourceMode = "test" | "development" | "production";

export class DataSourceConfig {
  private static instance: DataSource;

  static getInstance(mode: DataSourceMode = "development"): DataSource {
    if (!this.instance) {
      this.instance = mode === "test" ? TestDataSource : AppDataSource;
    }
    return this.instance;
  }
}
