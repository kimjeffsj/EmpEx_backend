import { TestDataSource } from "@/app/config/test-database";

beforeAll(async () => {
  try {
    await TestDataSource.initialize();
    await TestDataSource.synchronize(true);
    console.log("Test Database initialized");
  } catch (error) {
    console.error("Error during Test Database initialization", error);
    throw error;
  }
});

afterAll(async () => {
  if (TestDataSource.isInitialized) {
    await TestDataSource.dropDatabase();
    await TestDataSource.destroy();
  }
});
