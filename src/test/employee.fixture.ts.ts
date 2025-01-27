import { Employee } from "@/entities/Employee";
import { EmployeeService } from "@/features/employee/service/employee.service";
import { TestDataSource } from "@/app/config/test-database";

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

export const createTestEmployeeRaw = async () => {
  return await TestDataSource.getRepository(Employee).save(mockEmployeeData);
};
