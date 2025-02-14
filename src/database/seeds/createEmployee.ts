import { hash } from "bcrypt";
import { AppDataSource } from "../../app/config/database";
import { User, UserRole } from "../../entities/User";
import { Employee } from "../../entities/Employee";
import { EmployeeUser } from "../../entities/EmployeeUser";
import dotenv from "dotenv";

dotenv.config();

interface TestEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  sinNumber: string;
  address: string;
  dateOfBirth: Date;
  payRate: number;
  startDate: Date;
  password: string;
}

// Mock data for test employees
const testEmployees: TestEmployeeData[] = [
  {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    sinNumber: "123456789",
    address: "123 Main St, Vancouver, BC",
    dateOfBirth: new Date("1990-01-15"),
    payRate: 25.0,
    startDate: new Date("2023-01-01"),
    password: "Employee123!",
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    sinNumber: "987654321",
    address: "456 Oak St, Vancouver, BC",
    dateOfBirth: new Date("1992-03-20"),
    payRate: 27.5,
    startDate: new Date("2023-02-15"),
    password: "Employee123!",
  },
  {
    firstName: "Michael",
    lastName: "Johnson",
    email: "michael.johnson@example.com",
    sinNumber: "456789123",
    address: "789 Pine St, Vancouver, BC",
    dateOfBirth: new Date("1988-07-10"),
    payRate: 30.0,
    startDate: new Date("2023-03-01"),
    password: "Employee123!",
  },
  {
    firstName: "Jeff",
    lastName: "Kim",
    email: "employee@test.com",
    sinNumber: "126783123",
    address: "6655 Korea St, Vancouver, BC",
    dateOfBirth: new Date("1991-05-04"),
    payRate: 30.0,
    startDate: new Date("2025-02-01"),
    password: "123456kk",
  },
];

async function createInitialEmployees() {
  try {
    // Connect to DB
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);
    const employeeRepository = AppDataSource.getRepository(Employee);
    const employeeUserRepository = AppDataSource.getRepository(EmployeeUser);

    // Create employees one by one
    for (const employeeData of testEmployees) {
      // Check if employee already exists
      const existingEmployee = await employeeRepository.findOne({
        where: [
          { email: employeeData.email },
          { sinNumber: employeeData.sinNumber },
        ],
      });

      if (existingEmployee) {
        console.log(
          `Employee ${employeeData.email} already exists, skipping...`
        );
        continue;
      }

      // Create employee record
      const employee = employeeRepository.create({
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        sinNumber: employeeData.sinNumber,
        address: employeeData.address,
        dateOfBirth: employeeData.dateOfBirth,
        payRate: employeeData.payRate,
        startDate: employeeData.startDate,
      });

      await employeeRepository.save(employee);

      // Create user account for employee
      const hashedPassword = await hash(employeeData.password, 10);
      const user = userRepository.create({
        email: employeeData.email,
        password_hash: hashedPassword,
        first_name: employeeData.firstName,
        last_name: employeeData.lastName,
        role: UserRole.EMPLOYEE,
        is_active: true,
      });

      await userRepository.save(user);

      // Create employee-user link
      const employeeUser = employeeUserRepository.create({
        userId: user.id,
        employeeId: employee.id,
      });

      await employeeUserRepository.save(employeeUser);

      console.log(
        `Created employee account for ${employeeData.firstName} ${employeeData.lastName}`
      );
    }

    console.log("Initial employee accounts created successfully");
  } catch (error) {
    console.error("Error creating employee accounts:", error);
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
  createInitialEmployees()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createInitialEmployees };
