import { AppDataSource } from "@/app/config/database";
import { Employee } from "@/entities/Employee";
import {
  CreateEmployeeDto,
  EmployeeFilters,
  PaginatedEmployeeResponse,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";
import {
  DatabaseError,
  DuplicateError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { QueryFailedError, Repository } from "typeorm";

export class EmployeeService {
  private employeeRepository: Repository<Employee>;

  constructor() {
    this.employeeRepository = AppDataSource.getRepository(Employee);
  }

  async createEmployee(employeeData: CreateEmployeeDto): Promise<Employee> {
    try {
      if (!employeeData.email || !employeeData.sinNumber) {
        throw new ValidationError("Required fields are missing");
      }

      const existingEmail = await this.employeeRepository.findOne({
        where: { email: employeeData.email },
      });
      if (existingEmail) {
        throw new DuplicateError("Employee", "email");
      }

      const existingSIN = await this.employeeRepository.findOne({
        where: { sinNumber: employeeData.sinNumber },
      });
      if (existingSIN) {
        throw new DuplicateError("Employee", "SIN number");
      }

      const employee = this.employeeRepository.create(employeeData);
      return await this.employeeRepository.save(employee);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while creating employee: ${error.message}`
        );
      }
      throw error;
    }
  }

  async getEmployeeById(id: number): Promise<Employee> {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id },
      });

      if (!employee) {
        throw new NotFoundError(`Employee with ID ${id}`);
      }

      return employee;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while fetching employee: ${error.message}`
        );
      }
      throw error;
    }
  }

  async updateEmployee(
    id: number,
    updateData: UpdateEmployeeDto
  ): Promise<Employee> {
    try {
      // Check if employee exist
      const existingEmployee = await this.getEmployeeById(id);

      // Check email
      if (updateData.email && updateData.email !== existingEmployee.email) {
        const emailExists = await this.employeeRepository.findOne({
          where: { email: updateData.email },
        });
        if (emailExists) {
          throw new DuplicateError("Employee", "email");
        }
      }

      // Check SIN number
      if (
        updateData.sinNumber &&
        updateData.sinNumber !== existingEmployee.sinNumber
      ) {
        const sinExists = await this.employeeRepository.findOne({
          where: { sinNumber: updateData.sinNumber },
        });
        if (sinExists) {
          throw new DuplicateError("Employee", "SIN number");
        }
      }

      await this.employeeRepository.update(id, updateData);
      return await this.getEmployeeById(id);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while updating employee: ${error.message}`
        );
      }
      throw error;
    }
  }

  async deleteEmployee(id: number): Promise<boolean> {
    try {
      // Check if employee exists
      await this.getEmployeeById(id);

      const result = await this.employeeRepository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while deleting employee: ${error.message}`
        );
      }
      throw error;
    }
  }

  async getEmployees(
    filters: EmployeeFilters
  ): Promise<PaginatedEmployeeResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        isResigned,
        search,
        sortBy = "id",
        sortOrder = "ASC",
      } = filters;

      if (page < 1 || limit < 1) {
        throw new ValidationError("Invalid pagination parameters");
      }

      const queryBuilder =
        this.employeeRepository.createQueryBuilder("employee");

      // Search
      if (search) {
        queryBuilder.where(
          "employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.email ILIKE :search",
          { search: `%${search}%` }
        );
      }

      // isResigned filtering
      if (typeof isResigned === "boolean") {
        queryBuilder.andWhere(
          "employee.resignedDate IS " + (isResigned ? "NOT NULL" : "NULL")
        );
      }

      // Sort
      queryBuilder.orderBy(`employee.${sortBy}`, sortOrder);

      // Pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while fetching employees: ${error.message}`
        );
      }
      throw error;
    }
  }
}
