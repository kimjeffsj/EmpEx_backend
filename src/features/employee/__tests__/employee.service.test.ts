import { TestDataSource } from "@/app/config/test-database";
import { EmployeeService } from "../service/employee.service";
import { Employee } from "@/entities/Employee";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";
import {
  NotFoundError,
  ValidationError,
  DuplicateError,
} from "@/shared/types/error.types";
import {
  createTestEmployee,
  mockEmployeeData,
} from "@/test/employee.fixture.ts";

describe("EmployeeService", () => {
  let employeeService: EmployeeService;
  let testEmployee: Employee;

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
    testEmployee = await createTestEmployee(employeeService);
  });

  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  });

  describe("createEmployee", () => {
    it("should create a new employee successfully", async () => {
      const newEmployee = await employeeService.createEmployee({
        ...mockEmployeeData,
        email: "new@example.com",
        sinNumber: "987654321",
      });

      expect(newEmployee).toBeDefined();
      expect(newEmployee.email).toBe("new@example.com");
    });

    it("should throw ValidationError when required fields are missing", async () => {
      const invalidData = { ...mockEmployeeData };
      delete (invalidData as any).email;

      await expect(async () => {
        await employeeService.createEmployee(invalidData as CreateEmployeeDto);
      }).rejects.toThrow(ValidationError);
    });

    it("should throw DuplicateError when email already exists", async () => {
      await expect(async () => {
        await employeeService.createEmployee(mockEmployeeData);
      }).rejects.toThrow(DuplicateError);
    });

    it("should throw DuplicateError when SIN number already exists", async () => {
      await expect(async () => {
        await employeeService.createEmployee({
          ...mockEmployeeData,
          email: "different@example.com",
        });
      }).rejects.toThrow(DuplicateError);
    });
  });

  describe("getEmployeeById", () => {
    it("should return employee by id successfully", async () => {
      const employee = await employeeService.getEmployeeById(testEmployee.id);
      expect(employee).toBeDefined();
      expect(employee.id).toBe(testEmployee.id);
    });

    it("should throw NotFoundError for non-existent employee", async () => {
      await expect(async () => {
        await employeeService.getEmployeeById(999999);
      }).rejects.toThrow(NotFoundError);
    });
  });

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

      expect(updatedEmployee.firstName).toBe("Jane");
      expect(Number(updatedEmployee.payRate)).toBe(30.0);
    });

    it("should throw NotFoundError when updating non-existent employee", async () => {
      const updateData: UpdateEmployeeDto = { firstName: "Jane" };

      await expect(async () => {
        await employeeService.updateEmployee(999999, updateData);
      }).rejects.toThrow(NotFoundError);
    });

    it("should throw DuplicateError when updating to existing email", async () => {
      // Create another employee
      const anotherEmployee = await employeeService.createEmployee({
        ...mockEmployeeData,
        email: "jane@example.com",
        sinNumber: "987654321",
      });

      await expect(async () => {
        await employeeService.updateEmployee(testEmployee.id, {
          email: "jane@example.com",
        });
      }).rejects.toThrow(DuplicateError);
    });
  });

  describe("deleteEmployee", () => {
    it("should delete employee successfully", async () => {
      const result = await employeeService.deleteEmployee(testEmployee.id);
      expect(result).toBe(true);

      await expect(async () => {
        await employeeService.getEmployeeById(testEmployee.id);
      }).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when deleting non-existent employee", async () => {
      await expect(async () => {
        await employeeService.deleteEmployee(999999);
      }).rejects.toThrow(NotFoundError);
    });
  });

  describe("getEmployees", () => {
    beforeEach(async () => {
      await employeeService.createEmployee({
        ...mockEmployeeData,
        email: "jane@example.com",
        sinNumber: "987654321",
        firstName: "Jane",
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
    });

    it("should throw ValidationError for invalid pagination parameters", async () => {
      await expect(async () => {
        await employeeService.getEmployees({
          page: 0,
          limit: -1,
        });
      }).rejects.toThrow(ValidationError);
    });

    it("should filter employees by search term", async () => {
      const result = await employeeService.getEmployees({
        search: "Jane",
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe("Jane");
    });
  });
});
