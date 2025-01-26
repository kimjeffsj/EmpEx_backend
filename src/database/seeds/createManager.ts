import { hash } from "bcrypt";
import { AppDataSource } from "@/app/config/database";
import { User, UserRole } from "@/entities/User";
import dotenv from "dotenv";

dotenv.config();

async function createInitialManager() {
  try {
    // Connect to DB
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);

    // Check if manager exist
    const existingManager = await userRepository.findOne({
      where: { role: UserRole.MANAGER },
    });

    if (existingManager) {
      console.log("Manager account already exists");
      return;
    }

    // Check envs
    const { MANAGER_EMAIL, MANAGER_PASSWORD } = process.env;

    if (!MANAGER_EMAIL || !MANAGER_PASSWORD) {
      throw new Error(
        "MANAGER_EMAIL and MANAGER_PASSWORD must be set in environment variables"
      );
    }

    const hashedPassword = await hash(MANAGER_PASSWORD, 10);

    const manager = userRepository.create({
      email: MANAGER_EMAIL,
      password_hash: hashedPassword,
      first_name: "Admin",
      last_name: "User",
      role: UserRole.MANAGER,
      is_active: true,
    });

    await userRepository.save(manager);
    console.log("Initial manager account created successfully");
  } catch (error) {
    console.error("Error creating manager account:", error);
    throw error;
  } finally {
    // Disconnect DB
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Execute only when script is run directly
if (require.main === module) {
  createInitialManager()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createInitialManager };
