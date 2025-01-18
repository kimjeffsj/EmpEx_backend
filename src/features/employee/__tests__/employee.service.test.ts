import { TestDataSource } from "@/app/config/test-database";
import { EmployeeService } from "../service/employee.service";
import { Employee } from "@/entities/Employee";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";

describe("EmployeeService", () => {
  let employeeService: EmployeeService;
  let testEmployee: Employee;

  const mockEmployeeData: CreateEmployeeDto = {
    firstName: "John",
    lastName: "Doe",
    sinNumber: "123456789",
    email: "john@example.com",
    address: "123 Main St",
    dateOfBirth: new Date("1990-01-01"),
    payRate: 25.0,
    startDate: new Date(),
  };

  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }
    employeeService = new EmployeeService();
    employeeService["employeeRepository"] =
      TestDataSource.getRepository(Employee);
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    testEmployee = await employeeService.createEmployee(mockEmployeeData);
  });

  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  });

  // POST
  // Create a new Employee
  describe("createEmployee", () => {
    it("should create a new employee successfully", async () => {
      const newEmployeeData: CreateEmployeeDto = {
        ...mockEmployeeData,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        sinNumber: "987654321",
      };

      const newEmployee = await employeeService.createEmployee(newEmployeeData);

      expect(newEmployee).toBeDefined();
      expect(newEmployee.id).toBeDefined();
      expect(newEmployee.firstName).toBe(newEmployeeData.firstName);
      expect(newEmployee.email).toBe(newEmployeeData.email);
    });

    it("should throw error when creating employee with duplicate email", async () => {
      const duplicateEmployee = { ...mockEmployeeData };
      await expect(
        employeeService.createEmployee(duplicateEmployee)
      ).rejects.toThrow();
    });
  });

  // GET
  // Get one employee
  describe("getEmployeeById", () => {
    it("should return employee by id", async () => {
      const employee = await employeeService.getEmployeeById(testEmployee.id);

      expect(employee).toBeDefined();
      expect(employee?.id).toBe(testEmployee.id);
      expect(employee?.email).toBe(testEmployee.email);
    });

    it("should return null for non-existent employee", async () => {
      const employee = await employeeService.getEmployeeById(999999);
      expect(employee).toBeNull();
    });
  });

  // PUT
  // Update Employee information
  describe("updateEmployee", () => {
    it("should update employee successfully", async () => {
      const updateData: UpdateEmployeeDto = {
        firstName: "Jane",
        payRate: 30.0,
      };

      const updatedEmployee = await employeeService.updateEmployee(
        testEmployee.id,
        updateData
      );

      expect(updatedEmployee).toBeDefined();
      expect(updatedEmployee?.firstName).toBe(updateData.firstName);
      expect(Number(updatedEmployee?.payRate)).toBe(updateData.payRate);
      expect(updatedEmployee?.lastName).toBe(testEmployee.lastName); // Keep not updated field
    });

    it("should return null when updating non-existent employee", async () => {
      const updateData: UpdateEmployeeDto = { firstName: "Jane" };
      const result = await employeeService.updateEmployee(999999, updateData);
      expect(result).toBeNull();
    });
  });

  // DELETE
  // Delete a employee
  describe("deleteEmployee", () => {
    it("should delete employee successfully", async () => {
      const result = await employeeService.deleteEmployee(testEmployee.id);
      expect(result).toBe(true);

      const deletedEmployee = await employeeService.getEmployeeById(
        testEmployee.id
      );
      expect(deletedEmployee).toBeNull();
    });

    it("should return false when deleting non-existent employee", async () => {
      const result = await employeeService.deleteEmployee(999999);
      expect(result).toBe(false);
    });
  });

  // GET
  // All Employees
  describe("getEmployees", () => {
    beforeEach(async () => {
      await employeeService.createEmployee({
        ...mockEmployeeData,
        firstName: "Jane",
        email: "jane@example.com",
        sinNumber: "987654321",
      });
    });

    it("should return paginated employees", async () => {
      const result = await employeeService.getEmployees({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter employees by search term", async () => {
      const result = await employeeService.getEmployees({
        search: "john",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe("john@example.com");
    });

    it("should sort employees", async () => {
      const result = await employeeService.getEmployees({
        sortBy: "email",
        sortOrder: "DESC",
      });

      expect(result.data[0].email).toBe("john@example.com");
      expect(result.data[1].email).toBe("jane@example.com");
    });
  });
});
