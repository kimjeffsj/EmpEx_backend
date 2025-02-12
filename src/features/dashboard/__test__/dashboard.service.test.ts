import { TestDataSource } from "@/app/config/test-database";
import { DashboardService } from "../service/dashboard.service";
import { Employee } from "@/entities/Employee";
import {
  PayPeriod,
  PayPeriodStatus,
  PayPeriodType,
} from "@/entities/PayPeriod";
import { Timesheet } from "@/entities/Timesheet";
import { Payroll, PayrollStatus } from "@/entities/Payroll";
import { NotFoundError } from "@/shared/types/error.types";
import { Repository } from "typeorm";
import { createTestEmployeeRaw } from "@/test/\bemployee.fixture";

describe("DashboardService", () => {
  let dashboardService: DashboardService;
  let testEmployee: Employee;
  let testPayPeriod: PayPeriod;
  let employeeRepository: Repository<Employee>;
  let payPeriodRepository: Repository<PayPeriod>;
  let timesheetRepository: Repository<Timesheet>;
  let payrollRepository: Repository<Payroll>;

  beforeAll(async () => {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
    }

    dashboardService = new DashboardService(TestDataSource);
    employeeRepository = TestDataSource.getRepository(Employee);
    payPeriodRepository = TestDataSource.getRepository(PayPeriod);
    timesheetRepository = TestDataSource.getRepository(Timesheet);
    payrollRepository = TestDataSource.getRepository(Payroll);
  });

  beforeEach(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.synchronize(true);
    }

    // Create test employee
    testEmployee = await createTestEmployeeRaw(TestDataSource);

    // Create test pay period
    testPayPeriod = await payPeriodRepository.save({
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-03-15"),
      periodType: PayPeriodType.FIRST_HALF,
      status: PayPeriodStatus.PROCESSING,
    });

    // Create test timesheet
    const today = new Date();

    await timesheetRepository.save({
      employeeId: testEmployee.id,
      startTime: new Date(today.getFullYear(), today.getMonth(), 1, 9, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), 1, 18, 0),
      regularHours: 8,
      overtimeHours: 0,
      totalHours: 8,
      totalPay: 200,
      payPeriodId: testPayPeriod.id,
    });

    // Create test payroll
    await payrollRepository.save({
      employeeId: testEmployee.id,
      payPeriodId: testPayPeriod.id,
      totalRegularHours: 8,
      totalOvertimeHours: 0,
      totalHours: 8,
      grossPay: 200,
      status: PayrollStatus.DRAFT,
    });
  });

  afterAll(async () => {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
    }
  });

  describe("getManagerDashboardStats", () => {
    it("should return complete manager dashboard statistics", async () => {
      const stats = await dashboardService.getManagerDashboardStats();

      expect(stats).toBeDefined();
      expect(stats.totalEmployees).toBe(1);
      expect(stats.newHires).toBe(1);
      expect(stats.resignations).toBe(0);
      expect(stats.pendingPayroll).toBe(200);

      expect(stats.currentPeriod).toBeDefined();
      expect(stats.currentPeriod.id).toBe(testPayPeriod.id);
      expect(stats.currentPeriod.submittedTimesheets).toBe(1);
      expect(stats.currentPeriod.totalHours).toBe(8);
      expect(stats.currentPeriod.overtimeHours).toBe(0);

      expect(stats.timesheetStats).toBeDefined();
      expect(stats.timesheetStats.submitted).toBe(1);
      expect(stats.timesheetStats.pending).toBe(0);
    });

    it("should throw NotFoundError when no active pay period exists", async () => {
      await payPeriodRepository.update(testPayPeriod.id, {
        status: PayPeriodStatus.COMPLETED,
      });

      await expect(dashboardService.getManagerDashboardStats()).rejects.toThrow(
        NotFoundError
      );
    });

    it("should correctly count new hires within last 30 days", async () => {
      const oldEmployee = await createTestEmployeeRaw(TestDataSource);

      const stats = await dashboardService.getManagerDashboardStats();
      expect(stats.newHires).toBe(1); // Only counting testEmployee
    });
  });

  describe("getEmployeeDashboardStats", () => {
    it("should return complete employee dashboard statistics", async () => {
      const stats = await dashboardService.getEmployeeDashboardStats(
        testEmployee.id
      );

      expect(stats).toBeDefined();
      expect(stats.timesheet.currentPeriod).toBeDefined();
      expect(stats.timesheet.currentPeriod.regularHours).toBe(8);
      expect(stats.timesheet.currentPeriod.totalPay).toBe(200);

      expect(stats.timesheet.monthlyHours).toBeDefined();
      expect(stats.timesheet.monthlyHours.regularHours).toBe(8);
      expect(stats.timesheet.monthlyHours.overtimeHours).toBe(0);

      expect(stats.payroll.lastPaystub).toBeNull(); // No completed payroll yet
    });

    it("should throw NotFoundError for non-existent employee", async () => {
      await expect(
        dashboardService.getEmployeeDashboardStats(9999)
      ).rejects.toThrow(NotFoundError);
    });

    it("should return last completed payroll information", async () => {
      // Update payroll status to completed
      await payrollRepository.update(
        { employeeId: testEmployee.id },
        { status: PayrollStatus.COMPLETED }
      );

      const stats = await dashboardService.getEmployeeDashboardStats(
        testEmployee.id
      );
      expect(stats.payroll.lastPaystub).toBeDefined();
      expect(stats.payroll.lastPaystub?.grossPay).toBe(200);
    });

    it("should calculate monthly hours correctly with multiple timesheets", async () => {
      const today = new Date();
      // Add another timesheet for current month
      await timesheetRepository.save({
        employeeId: testEmployee.id,
        startTime: new Date(today.getFullYear(), today.getMonth(), 2, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), 2, 18, 0),
        regularHours: 8,
        overtimeHours: 1,
        totalHours: 9,
        totalPay: 225,
        payPeriodId: testPayPeriod.id,
      });

      const stats = await dashboardService.getEmployeeDashboardStats(
        testEmployee.id
      );
      expect(stats.timesheet.monthlyHours.regularHours).toBe(16);
      expect(stats.timesheet.monthlyHours.overtimeHours).toBe(1);
      expect(stats.timesheet.monthlyHours.totalHours).toBe(17);
    });
  });
});
