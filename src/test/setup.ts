import { TestDataSource } from "@/app/config/test-database";

beforeAll(async () => {
  jest.setTimeout(30000);

  try {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
    await TestDataSource.initialize();
    await TestDataSource.synchronize(true);
    console.log("Test Database initialized");
  } catch (error) {
    console.error("Error during Test Database initialization", error);
    throw error;
  }
});

beforeEach(async () => {
  if (TestDataSource.isInitialized) {
    await TestDataSource.synchronize(true);
  }
});

afterAll(async () => {
  if (TestDataSource.isInitialized) {
    await TestDataSource.dropDatabase();
    await TestDataSource.destroy();
  }
});
