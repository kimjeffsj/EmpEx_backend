import { Employee } from "@/entities/Employee";
import { EmployeeUser } from "@/entities/EmployeeUser";
import { User, UserRole } from "@/entities/User";
import { EmployeeService } from "@/features/employee/service/employee.service";
import { hash } from "bcrypt";
import { DataSource } from "typeorm";

export const mockEmployeeData = {
  firstName: "John",
  lastName: "Doe",
  sinNumber: "123456789",
  email: "john@example.com",
  address: "123 Main St",
  dateOfBirth: new Date("1990-01-01"),
  payRate: 25.0,
  startDate: new Date(),
};

export const createTestEmployee = async (employeeService: EmployeeService) => {
  return await employeeService.createEmployee(mockEmployeeData);
};

export const createTestEmployeeRaw = async (dataSource: DataSource) => {
  return await dataSource.getRepository(Employee).save(mockEmployeeData);
};

export const createTestEmployeeWithUser = async (dataSource: DataSource) => {
  // Create employee
  const employee = await createTestEmployeeRaw(dataSource);

  // Create user account
  const hashedPassword = await hash("Password123!", 10);
  const user = await dataSource.getRepository(User).save({
    email: `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}@test.com`,
    password_hash: hashedPassword,
    first_name: employee.firstName,
    last_name: employee.lastName,
    role: UserRole.EMPLOYEE,
    is_active: true,
  });

  // Create EmployeeUser relationship
  await dataSource.getRepository(EmployeeUser).save({
    userId: user.id,
    employeeId: employee.id,
  });

  return { employee, user };
};
