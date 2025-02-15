import { AppDataSource } from "../../app/config/database";
import {
  PayPeriod,
  PayPeriodType,
  PayPeriodStatus,
} from "../../entities/PayPeriod";
import { Timesheet } from "../../entities/Timesheet";
import { Payroll, PayrollStatus } from "../../entities/Payroll";
import { Employee } from "../../entities/Employee";
import dotenv from "dotenv";

dotenv.config();

async function createTimesheetAndPayrollData() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const payPeriodRepository = AppDataSource.getRepository(PayPeriod);
    const timesheetRepository = AppDataSource.getRepository(Timesheet);
    const payrollRepository = AppDataSource.getRepository(Payroll);
    const employeeRepository = AppDataSource.getRepository(Employee);

    // Get all employees
    const employees = await employeeRepository.find();

    // Define pay periods
    const payPeriods = [
      {
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-15"),
        periodType: PayPeriodType.FIRST_HALF,
        status: PayPeriodStatus.COMPLETED,
      },
      {
        startDate: new Date("2025-01-16"),
        endDate: new Date("2025-01-31"),
        periodType: PayPeriodType.SECOND_HALF,
        status: PayPeriodStatus.COMPLETED,
      },
      {
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-02-15"),
        periodType: PayPeriodType.FIRST_HALF,
        status: PayPeriodStatus.PROCESSING,
      },
    ];

    // Create pay periods
    for (const periodData of payPeriods) {
      const existingPeriod = await payPeriodRepository.findOne({
        where: {
          startDate: periodData.startDate,
          endDate: periodData.endDate,
        },
      });

      if (existingPeriod) {
        console.log(
          `Pay period already exists for ${periodData.startDate} to ${periodData.endDate}`
        );
        continue;
      }

      const payPeriod = await payPeriodRepository.save(periodData);
      console.log(
        `Created pay period: ${payPeriod.startDate} to ${payPeriod.endDate}`
      );

      // Create timesheets and payrolls for each employee
      for (const employee of employees) {
        // Generate timesheets for work days in the period
        let currentDate = new Date(payPeriod.startDate);
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;

        while (currentDate <= payPeriod.endDate) {
          // Skip weekends
          if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            // Random overtime (20% chance)
            const overtimeHours = Math.random() < 0.2 ? 2 : 0;
            const regularHours = 8;

            const timesheet = timesheetRepository.create({
              employeeId: employee.id,
              payPeriodId: payPeriod.id,
              startTime: new Date(currentDate.setHours(9, 0, 0)),
              endTime: new Date(
                currentDate.setHours(17 + (overtimeHours > 0 ? 2 : 0), 0, 0)
              ),
              regularHours,
              overtimeHours,
              totalHours: regularHours + overtimeHours,
              totalPay: (regularHours + overtimeHours * 1.5) * employee.payRate,
            });

            await timesheetRepository.save(timesheet);
            totalRegularHours += regularHours;
            totalOvertimeHours += overtimeHours;
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Create payroll for the period
        const totalHours = totalRegularHours + totalOvertimeHours * 1.5;
        const grossPay = totalHours * employee.payRate;

        const payroll = payrollRepository.create({
          employeeId: employee.id,
          payPeriodId: payPeriod.id,
          totalRegularHours,
          totalOvertimeHours,
          totalHours,
          grossPay,
          status:
            payPeriod.status === PayPeriodStatus.COMPLETED
              ? PayrollStatus.COMPLETED
              : PayrollStatus.DRAFT,
        });

        await payrollRepository.save(payroll);
        console.log(
          `Created payroll for employee ${employee.id} in period ${payPeriod.id}`
        );
      }
    }

    console.log("Successfully created timesheet and payroll data");
  } catch (error) {
    console.error("Error creating timesheet and payroll data:", error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Execute only when script is run directly
if (require.main === module) {
  createTimesheetAndPayrollData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createTimesheetAndPayrollData };
