import { Employee } from "@/entities/Employee";
import { EmployeeService } from "@/features/employee/service/employee.service";
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
