import { TestDataSource } from "@/app/config/test-database";
import { PayrollService } from "../service/payroll.service";
import { Employee } from "@/entities/Employee";
import {
  PayPeriod,
  PayPeriodStatus,
  PayPeriodType,
} from "@/entities/PayPeriod";
import { Payroll, PayrollStatus } from "@/entities/Payroll";
import { Timesheet } from "@/entities/Timesheet";
import { NotFoundError, ValidationError } from "@/shared/types/error.types";
import { Repository } from "typeorm";
import { createTestEmployeeRaw } from "@/test/employee.fixture.ts";

describe("PayrollService", () => {
  let payrollService: PayrollService;
  let testEmployee: Employee;
  let payrollRepository: Repository<Payroll>;
  let payPeriodRepository: Repository<PayPeriod>;
  let timesheetRepository: Repository<Timesheet>;
  let employeeRepository: Repository<Employee>;

  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }

    payrollRepository = TestDataSource.getRepository(Payroll);
    payPeriodRepository = TestDataSource.getRepository(PayPeriod);
    timesheetRepository = TestDataSource.getRepository(Timesheet);
    employeeRepository = TestDataSource.getRepository(Employee);

    payrollService = new PayrollService(TestDataSource);

    payrollService["payrollRepository"] = payrollRepository;
    payrollService["payPeriodRepository"] = payPeriodRepository;
    payrollService["timesheetRepository"] = timesheetRepository;
    payrollService["employeeRepository"] = employeeRepository;
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    testEmployee = await createTestEmployeeRaw(TestDataSource);
  });

  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  });

  describe("getOrCreatePayPeriod", () => {
    it("should create a new pay period for first half of month", async () => {
      const result = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );

      expect(result).toBeDefined();

      expect(new Date(result.startDate).toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 1)).toISOString()
      );
      expect(new Date(result.endDate).toDateString()).toBe(
        new Date(Date.UTC(2024, 2, 15)).toDateString()
      );
      expect(result.periodType).toBe(PayPeriodType.FIRST_HALF);
      expect(result.status).toBe(PayPeriodStatus.PROCESSING);
    });

    it("should create a new pay period for second half of month", async () => {
      const result = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.SECOND_HALF,
        2024,
        3
      );

      expect(result).toBeDefined();
      expect(new Date(result.startDate).toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 16)).toISOString()
      );
      expect(new Date(result.endDate).toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 31)).toISOString()
      );
      expect(result.periodType).toBe(PayPeriodType.SECOND_HALF);
      expect(result.status).toBe(PayPeriodStatus.PROCESSING);
    });

    it("should force recalculate existing pay period when specified", async () => {
      // First creation
      const firstPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );

      // Force recalculation
      const recalculatedPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3,
        { forceRecalculate: true }
      );

      expect(recalculatedPeriod.id).not.toBe(firstPeriod.id);
      expect(recalculatedPeriod.status).toBe(PayPeriodStatus.PROCESSING);
    });
  });

  describe("calculatePeriodPayroll", () => {
    let payPeriod: PayPeriod;

    beforeEach(async () => {
      // Create pay period
      payPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );

      // Create timesheets for the period
      const timesheetData = {
        employeeId: testEmployee.id,
        payPeriodId: payPeriod.id,
        startTime: new Date(Date.UTC(2024, 2, 1, 9, 0, 0)),
        endTime: new Date(Date.UTC(2024, 2, 1, 17, 0, 0)),
        regularHours: 8.0,
        overtimeHours: 0,
        totalHours: 8.0,
        totalPay: 200.0, // 8 hours * $25
      };

      await timesheetRepository.save(timesheetData);
    });

    it("should calculate payroll for the period", async () => {
      await payrollService.calculatePeriodPayroll(payPeriod.id);

      const payrolls = await payrollRepository.find({
        where: { payPeriodId: payPeriod.id },
        relations: ["employee"],
      });

      expect(payrolls).toHaveLength(1);
      expect(Number(payrolls[0].totalRegularHours)).toBe(8);
      expect(Number(payrolls[0].totalOvertimeHours)).toBe(0);
      expect(Number(payrolls[0].grossPay)).toBe(200);
      expect(payrolls[0].status).toBe(PayrollStatus.DRAFT);
    });

    it("should throw NotFoundError for non-existent pay period", async () => {
      await expect(payrollService.calculatePeriodPayroll(9999)).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw ValidationError if pay period is already completed", async () => {
      await payPeriodRepository.update(payPeriod.id, {
        status: PayPeriodStatus.COMPLETED,
      });

      await expect(
        payrollService.calculatePeriodPayroll(payPeriod.id)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getPayPeriods", () => {
    beforeEach(async () => {
      // Create multiple pay periods
      await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );
      await payrollService.getOrCreatePayPeriod(
        PayPeriodType.SECOND_HALF,
        2024,
        3
      );
    });

    it("should return paginated pay periods", async () => {
      const result = await payrollService.getPayPeriods({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("should filter pay periods by date range", async () => {
      const testDate = new Date(Date.UTC(2024, 2, 1));

      const result = await payrollService.getPayPeriods({
        startDate: testDate,
        endDate: new Date(Date.UTC(2024, 2, 15)),
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].periodType).toBe(PayPeriodType.FIRST_HALF);
    });

    it("should filter by status", async () => {
      const payPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );
      await payrollService.completePayPeriod(payPeriod.id);

      const result = await payrollService.getPayPeriods({
        status: PayPeriodStatus.COMPLETED,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(PayPeriodStatus.COMPLETED);
    });
  });

  describe("completePayPeriod", () => {
    let payPeriod: PayPeriod;

    beforeEach(async () => {
      payPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );
    });

    it("should complete pay period successfully", async () => {
      const completedPeriod = await payrollService.completePayPeriod(
        payPeriod.id
      );

      expect(completedPeriod.status).toBe(PayPeriodStatus.COMPLETED);
    });

    it("should throw ValidationError when completing already completed period", async () => {
      // First complete the period
      await payrollService.completePayPeriod(payPeriod.id);

      // Try to complete again
      await expect(
        payrollService.completePayPeriod(payPeriod.id)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw NotFoundError for non-existent period", async () => {
      await expect(payrollService.completePayPeriod(9999)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
