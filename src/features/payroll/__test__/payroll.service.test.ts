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

describe("PayrollService", () => {
  let payrollService: PayrollService;
  let testEmployee: Employee;
  let payrollRepository: Repository<Payroll>;
  let payPeriodRepository: Repository<PayPeriod>;
  let timesheetRepository: Repository<Timesheet>;
  let employeeRepository: Repository<Employee>;

  const mockEmployeeData = {
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

    payrollRepository = TestDataSource.getRepository(Payroll);
    payPeriodRepository = TestDataSource.getRepository(PayPeriod);
    timesheetRepository = TestDataSource.getRepository(Timesheet);
    employeeRepository = TestDataSource.getRepository(Employee);

    payrollService = new PayrollService();
    // 서비스의 private 레포지토리 설정
    payrollService["payrollRepository"] = payrollRepository;
    payrollService["payPeriodRepository"] = payPeriodRepository;
    payrollService["timesheetRepository"] = timesheetRepository;
    payrollService["employeeRepository"] = employeeRepository;
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    testEmployee = await employeeRepository.save(mockEmployeeData);
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
      // toEqual 대신 날짜를 ISO 문자열로 변환하여 비교
      expect(result.startDate.toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 1, 0, 0, 0, 0)).toISOString()
      );
      expect(result.endDate.toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 15, 23, 59, 59, 999)).toISOString()
      );
      expect(result.periodType).toBe(PayPeriodType.FIRST_HALF);
      expect(result.status).toBe(PayPeriodStatus.PENDING);
    });

    it("should create a new pay period for second half of month", async () => {
      const result = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.SECOND_HALF,
        2024,
        3
      );

      expect(result).toBeDefined();
      expect(result.startDate.toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 16, 0, 0, 0, 0)).toISOString()
      );
      expect(result.endDate.toISOString()).toBe(
        new Date(Date.UTC(2024, 2, 31, 23, 59, 59, 999)).toISOString()
      );
      expect(result.periodType).toBe(PayPeriodType.SECOND_HALF);
    });

    it("should return existing pay period if already exists", async () => {
      const firstPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );
      const secondPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );

      expect(firstPeriod.id).toBe(secondPeriod.id);
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

    it("should throw ValidationError if pay period is not in PENDING status", async () => {
      // Update pay period status
      await payPeriodRepository.update(payPeriod.id, {
        status: PayPeriodStatus.PROCESSING,
      });

      await expect(
        payrollService.calculatePeriodPayroll(payPeriod.id)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updatePayPeriodStatus", () => {
    let payPeriod: PayPeriod;

    beforeEach(async () => {
      payPeriod = await payrollService.getOrCreatePayPeriod(
        PayPeriodType.FIRST_HALF,
        2024,
        3
      );
    });

    it("should update pay period status", async () => {
      const updatedPeriod = await payrollService.updatePayPeriodStatus(
        payPeriod.id,
        PayPeriodStatus.PROCESSING
      );

      expect(updatedPeriod.status).toBe(PayPeriodStatus.PROCESSING);
    });

    it("should throw NotFoundError for non-existent pay period", async () => {
      await expect(
        payrollService.updatePayPeriodStatus(9999, PayPeriodStatus.PROCESSING)
      ).rejects.toThrow(NotFoundError);
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

    it("should filter pay periods by status", async () => {
      await payrollService.updatePayPeriodStatus(1, PayPeriodStatus.PROCESSING);

      const result = await payrollService.getPayPeriods({
        status: PayPeriodStatus.PROCESSING,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(PayPeriodStatus.PROCESSING);
    });
  });
});
