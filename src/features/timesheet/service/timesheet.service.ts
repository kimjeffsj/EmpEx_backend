import { AppDataSource } from "@/app/config/database";
import { Employee } from "@/entities/Employee";
import { Timesheet } from "@/entities/Timesheet";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import {
  CreateTimesheetDto,
  PaginatedTimesheetResponse,
  TimesheetFilters,
  UpdateTimesheetDto,
} from "@/shared/types/timesheet.types";
import { QueryFailedError, Repository } from "typeorm";

export class TimesheetService {
  private timesheetRepository: Repository<Timesheet>;
  private employeeRepository: Repository<Employee>;

  constructor() {
    this.timesheetRepository = AppDataSource.getRepository(Timesheet);
    this.employeeRepository = AppDataSource.getRepository(Employee);
  }

  private async calculateTimesheet(
    timesheet: Timesheet,
    employee: Employee
  ): Promise<Timesheet> {
    try {
      // totalHours = regularHours + (overtimeHours * 1.5)
      timesheet.totalHours =
        timesheet.regularHours + timesheet.overtimeHours * 1.5;

      // totalPay = totalHours * payRate
      timesheet.totalPay = timesheet.totalHours * employee.payRate;

      return timesheet;
    } catch (error) {
      throw new ValidationError("Error calculating timesheet values");
    }
  }

  async createTimesheet(timesheetData: CreateTimesheetDto): Promise<Timesheet> {
    try {
      const employee = await this.employeeRepository.findOneBy({
        id: timesheetData.employeeId,
      });

      // Check if employee
      if (!employee) {
        throw new NotFoundError("Employee");
      }

      if (!timesheetData.regularHours || timesheetData.regularHours <= 0) {
        throw new ValidationError("Regular hours must be greater than 0");
      }

      let timesheet = this.timesheetRepository.create(timesheetData);
      timesheet = await this.calculateTimesheet(timesheet, employee);

      return await this.timesheetRepository.save(timesheet);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while creating timesheet: ${error.message}`
        );
      }
      throw error;
    }
  }

  async getTimesheetById(id: number): Promise<Timesheet> {
    try {
      const timesheet = await this.timesheetRepository.findOne({
        where: { id },
        relations: ["employee"],
      });

      if (!timesheet) {
        throw new NotFoundError(`Timesheet with ID ${id}`);
      }

      return timesheet;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while fetching timesheet: ${error.message}`
        );
      }
      throw error;
    }
  }

  async updateTimesheet(
    id: number,
    updateData: UpdateTimesheetDto
  ): Promise<Timesheet> {
    try {
      const timesheet = await this.getTimesheetById(id);
      const employee = await this.employeeRepository.findOneBy({
        id: timesheet.employeeId,
      });

      if (!employee) {
        throw new NotFoundError("Employee");
      }

      if (updateData.regularHours && updateData.regularHours <= 0) {
        throw new ValidationError("Regular hours must be greater than 0");
      }

      Object.assign(timesheet, updateData);
      await this.calculateTimesheet(timesheet, employee);

      return await this.timesheetRepository.save(timesheet);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while updating timesheet: ${error.message}`
        );
      }
      throw error;
    }
  }

  async deleteTimesheet(id: number): Promise<boolean> {
    try {
      // Check if timesheet exists
      await this.getTimesheetById(id);

      const result = await this.timesheetRepository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(
          `Database error while deleting timesheet: ${error.message}`
        );
      }
      throw error;
    }
  }

  async getTimesheets(
    filters: TimesheetFilters
  ): Promise<PaginatedTimesheetResponse> {
    try {
      const { employeeId, startDate, endDate, page = 1, limit = 10 } = filters;

      if (page < 1 || limit < 1) {
        throw new ValidationError("Invalid pagination parameters");
      }

      const queryBuilder = this.timesheetRepository
        .createQueryBuilder("timesheet")
        .leftJoinAndSelect("timesheet.employee", "employee");

      if (employeeId) {
        queryBuilder.andWhere("timesheet.employeeId = :employeeId", {
          employeeId,
        });
      }

      if (startDate) {
        const utcStart = new Date(
          Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        queryBuilder.andWhere("timesheet.startTime >= :startDate", {
          startDate: utcStart,
        });
      }

      if (endDate) {
        const utcEnd = new Date(
          Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            23,
            59,
            59,
            999
          )
        );
        queryBuilder.andWhere("timesheet.endTime <= :endDate", {
          endDate: utcEnd,
        });
      }

      queryBuilder.orderBy("timesheet.startTime", "DESC");

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
          `Database error while fetching timesheets: ${error.message}`
        );
      }
      throw error;
    }
  }
}
