import { TestDataSource } from "@/app/config/test-database";
import { TimesheetService } from "../service/timesheet.service";
import { Timesheet } from "@/entities/Timesheet";
import { Employee } from "@/entities/Employee";
import {
  CreateTimesheetDto,
  UpdateTimesheetDto,
} from "@/shared/types/timesheet.types";
import { NotFoundError, ValidationError } from "@/shared/types/error.types";
import { createTestEmployeeRaw } from "@/test/employee.fixture.ts";
import {
  PayPeriod,
  PayPeriodStatus,
  PayPeriodType,
} from "@/entities/PayPeriod";
import { Repository } from "typeorm";

describe("TimesheetService", () => {
  let timesheetService: TimesheetService;
  let testEmployee: Employee;
  let testPayPeriod: PayPeriod;
  let payPeriodRepository: Repository<PayPeriod>;

  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }
    timesheetService = new TimesheetService(TestDataSource);

    timesheetService["timesheetRepository"] =
      TestDataSource.getRepository(Timesheet);
    timesheetService["employeeRepository"] =
      TestDataSource.getRepository(Employee);
    payPeriodRepository = TestDataSource.getRepository(PayPeriod);
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    testEmployee = await createTestEmployeeRaw(TestDataSource);

    // Create test pay period
    testPayPeriod = await payPeriodRepository.save({
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-03-15"),
      periodType: PayPeriodType.FIRST_HALF,
      status: PayPeriodStatus.PROCESSING,
    });
  });

  afterAll(async () => {
    await TestDataSource.destroy();
  });

  describe("createTimesheet", () => {
    it("should create a timesheet successfully", async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: testEmployee.id,
        payPeriodId: testPayPeriod.id,
        startTime: new Date("2024-03-18T09:00:00"),
        endTime: new Date("2024-03-18T17:00:00"),
        regularHours: 8,
        overtimeHours: 0,
      };

      const timesheet = await timesheetService.createTimesheet(timesheetData);

      expect(timesheet).toBeDefined();
      expect(timesheet.employeeId).toBe(testEmployee.id);
      expect(timesheet.totalHours).toBe(8);
      expect(timesheet.totalPay).toBe(200); // 8 hours * $25 payRate
    });

    it("should create a timesheet with overtime hours", async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: testEmployee.id,
        payPeriodId: testPayPeriod.id,
        startTime: new Date("2024-03-18T09:00:00"),
        endTime: new Date("2024-03-18T19:00:00"),
        regularHours: 8,
        overtimeHours: 2,
      };

      const timesheet = await timesheetService.createTimesheet(timesheetData);

      expect(timesheet.totalHours).toBe(11); // 8 + (2 * 1.5)
      expect(timesheet.totalPay).toBe(275); // 11 hours * $25 payRate
    });

    it("should throw NotFoundError for non-existent employee", async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: 9999,
        payPeriodId: testPayPeriod.id,
        startTime: new Date(),
        endTime: new Date(),
        regularHours: 8,
      };

      await expect(
        timesheetService.createTimesheet(timesheetData)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError for invalid hours", async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: testEmployee.id,
        payPeriodId: testPayPeriod.id,
        startTime: new Date(),
        endTime: new Date(),
        regularHours: -1,
      };

      await expect(
        timesheetService.createTimesheet(timesheetData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getTimesheetById", () => {
    let testTimesheet: Timesheet;

    beforeEach(async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: testEmployee.id,
        payPeriodId: testPayPeriod.id,
        startTime: new Date("2024-03-18T09:00:00"),
        endTime: new Date("2024-03-18T17:00:00"),
        regularHours: 8,
      };
      testTimesheet = await timesheetService.createTimesheet(timesheetData);
    });

    it("should retrieve timesheet successfully", async () => {
      const timesheet = await timesheetService.getTimesheetById(
        testTimesheet.id
      );

      expect(timesheet).toBeDefined();
      expect(timesheet.id).toBe(testTimesheet.id);
      expect(timesheet.employeeId).toBe(testEmployee.id);
    });

    it("should throw NotFoundError for non-existent timesheet", async () => {
      await expect(timesheetService.getTimesheetById(9999)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("updateTimesheet", () => {
    let testTimesheet: Timesheet;

    beforeEach(async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: testEmployee.id,
        payPeriodId: testPayPeriod.id,
        startTime: new Date("2024-03-18T09:00:00"),
        endTime: new Date("2024-03-18T17:00:00"),
        regularHours: 8,
      };
      testTimesheet = await timesheetService.createTimesheet(timesheetData);
    });

    it("should update timesheet successfully", async () => {
      const updateData: UpdateTimesheetDto = {
        regularHours: 9,
        overtimeHours: 1,
      };

      const updatedTimesheet = await timesheetService.updateTimesheet(
        testTimesheet.id,
        updateData
      );

      expect(updatedTimesheet.regularHours).toBe(9);
      expect(updatedTimesheet.overtimeHours).toBe(1);
      expect(updatedTimesheet.totalHours).toBe(10.5); // 9 + (1 * 1.5)
      expect(updatedTimesheet.totalPay).toBe(262.5); // 10.5 * $25
    });

    it("should throw NotFoundError when updating non-existent timesheet", async () => {
      const updateData: UpdateTimesheetDto = {
        regularHours: 9,
      };

      await expect(
        timesheetService.updateTimesheet(9999, updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when updating with invalid hours", async () => {
      const updateData: UpdateTimesheetDto = {
        regularHours: -1,
      };

      await expect(
        timesheetService.updateTimesheet(testTimesheet.id, updateData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("deleteTimesheet", () => {
    let testTimesheet: Timesheet;

    beforeEach(async () => {
      const timesheetData: CreateTimesheetDto = {
        employeeId: testEmployee.id,
        payPeriodId: testPayPeriod.id,
        startTime: new Date("2024-03-18T09:00:00"),
        endTime: new Date("2024-03-18T17:00:00"),
        regularHours: 8,
      };
      testTimesheet = await timesheetService.createTimesheet(timesheetData);
    });

    it("should delete timesheet successfully", async () => {
      const result = await timesheetService.deleteTimesheet(testTimesheet.id);
      expect(result).toBe(true);

      await expect(
        timesheetService.getTimesheetById(testTimesheet.id)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when deleting non-existent timesheet", async () => {
      await expect(timesheetService.deleteTimesheet(9999)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("getTimesheets", () => {
    beforeEach(async () => {
      // Create multiple test timesheets
      const timesheets = [
        {
          employeeId: testEmployee.id,
          payPeriodId: testPayPeriod.id,
          startTime: new Date(Date.UTC(2024, 2, 18, 9, 0, 0)),
          endTime: new Date(Date.UTC(2024, 2, 18, 17, 0, 0)),
          regularHours: 8,
        },
        {
          employeeId: testEmployee.id,
          payPeriodId: testPayPeriod.id,
          startTime: new Date(Date.UTC(2024, 2, 19, 9, 0, 0)),
          endTime: new Date(Date.UTC(2024, 2, 19, 17, 0, 0)),
          regularHours: 8,
        },
      ];

      for (const timesheet of timesheets) {
        await timesheetService.createTimesheet(timesheet);
      }
    });

    it("should return paginated timesheets", async () => {
      const result = await timesheetService.getTimesheets({
        page: 1,
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("should filter timesheets by employee ID", async () => {
      const result = await timesheetService.getTimesheets({
        employeeId: testEmployee.id,
      });

      expect(result.data.length).toBe(2);
      result.data.forEach((timesheet) => {
        expect(timesheet.employeeId).toBe(testEmployee.id);
      });
    });

    it("should filter timesheets by date range", async () => {
      const testDate = new Date(Date.UTC(2024, 2, 18));

      const result = await timesheetService.getTimesheets({
        startDate: testDate,
        endDate: testDate,
      });

      expect(result.data.length).toBe(1);

      const resultDate = new Date(result.data[0].startTime);
      expect(resultDate.getUTCFullYear()).toBe(testDate.getUTCFullYear());
      expect(resultDate.getUTCMonth()).toBe(testDate.getUTCMonth());
      expect(resultDate.getUTCDate()).toBe(testDate.getUTCDate());
    });

    it("should throw ValidationError for invalid pagination parameters", async () => {
      await expect(
        timesheetService.getTimesheets({
          page: 0,
          limit: -1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
