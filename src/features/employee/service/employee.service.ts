import { AppDataSource } from "@/app/config/database";
import { Employee } from "@/entities/Employee";
import {
  CreateEmployeeDto,
  EmployeeFilters,
  PaginatedEmployeeResponse,
  UpdateEmployeeDto,
} from "@/shared/types/employee.types";
import { Repository } from "typeorm";

export class EmployeeService {
  private employeeRepository: Repository<Employee>;

  constructor() {
    this.employeeRepository = AppDataSource.getRepository(Employee);
  }

  async createEmployee(employeeData: CreateEmployeeDto): Promise<Employee> {
    const employee = this.employeeRepository.create(employeeData);
    return await this.employeeRepository.save(employee);
  }

  async getEmployeeById(id: number): Promise<Employee | null> {
    return await this.employeeRepository.findOneBy({ id });
  }

  async updateEmployee(
    id: number,
    updateData: UpdateEmployeeDto
  ): Promise<Employee | null> {
    await this.employeeRepository.update(id, updateData);
    return this.getEmployeeById(id);
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const result = await this.employeeRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async getEmployees(
    filters: EmployeeFilters
  ): Promise<PaginatedEmployeeResponse> {
    const {
      page = 1,
      limit = 10,
      isResigned,
      search,
      sortBy = "id",
      sortOrder = "ASC",
    } = filters;

    const queryBuilder = this.employeeRepository.createQueryBuilder("employee");

    // Add search conditions
    if (search) {
      queryBuilder.where(
        "employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.email ILIKE :search",
        { search: `%${search}%` }
      );
    }

    // Filter by resigned status
    if (typeof isResigned === "boolean") {
      queryBuilder.andWhere(
        "employee.resignedDate IS " + (isResigned ? "NOT NULL" : "NULL")
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`employee.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Fetch data
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
