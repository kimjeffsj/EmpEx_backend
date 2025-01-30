import { EmployeeService } from "@/features/employee/service/employee.service";
import { PayrollService } from "@/features/payroll/service/payroll.service";

import { ExcelGenerateOptions } from "../interfaces/excel.types";
import * as Excel from "exceljs";
import { formatDate, formatSIN } from "../utils/formatters";
import { getPayPeriodCode } from "@/shared/utils/payPeriodFormatter.utils";

export class ExcelService {
  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService
  ) {
    // this.payrollService = payrollService;
    // this.employeeService = employeeService;
  }

  private async createWorkbook(
    options: ExcelGenerateOptions
  ): Promise<Excel.Workbook> {
    const workbook = new Excel.Workbook();
    workbook.created = new Date();
    workbook.modified = new Date();
    return workbook;
  }

  async generatePayrollReport(payPeriodId: number): Promise<Buffer> {
    // Query pay period
    const payPeriod = await this.payrollService.getPayPeriodById(payPeriodId);
    const payrolls = payPeriod.payrolls;

    const periodCode = getPayPeriodCode(
      payPeriod.startDate,
      payPeriod.periodType
    );

    const options = {
      sheetName: "Payroll Report",
      fileName: `payroll_report_${periodCode}.xlsx`,
    };

    const workbook = await this.createWorkbook(options);
    const worksheet = workbook.addWorksheet(options.sheetName);

    // Set headers
    worksheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 12 },
      { header: "Last Name", key: "lastName", width: 15 },
      { header: "First Name", key: "firstName", width: 15 },
      {
        header: "Regular Hours",
        key: "regularHours",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      {
        header: "Overtime Hours",
        key: "overtimeHours",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      {
        header: "Total Hours",
        key: "totalHours",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      { header: "Pay Rate", key: "payRate", width: 12 },
      { header: "Gross Pay", key: "grossPay", width: 15 },
    ];

    // Apply styles
    worksheet.getRow(1).font = { bold: true };

    // Add data
    const reportData = payrolls.map((payroll) => ({
      employeeId: payroll.employeeId,
      lastName: payroll.employee.lastName,
      firstName: payroll.employee.firstName,
      regularHours: payroll.totalRegularHours,
      overtimeHours: payroll.totalOvertimeHours,
      totalHours: payroll.totalHours,
      payRate: payroll.employee.payRate,
      grossPay: payroll.grossPay,
    }));

    worksheet.addRows(reportData);

    // Apply number formats
    worksheet.getColumn("payRate").numFmt = '"$"#,##0.00';
    worksheet.getColumn("grossPay").numFmt = '"$"#,##0.00';

    // Add summary information
    const totalRows = reportData.length;
    worksheet.addRow([]);
    worksheet.addRow(["Summary"]);
    worksheet.addRow(["Total Employees", totalRows]);
    worksheet.addRow([
      "Total Regular Hours",
      reportData.reduce((sum, data) => sum + data.regularHours, 0),
    ]);
    worksheet.addRow([
      "Total Overtime Hours",
      reportData.reduce((sum, data) => sum + data.overtimeHours, 0),
    ]);
    worksheet.addRow([
      "Total Gross Pay",
      reportData.reduce((sum, data) => sum + data.grossPay, 0),
    ]);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generateT4BasicReport(): Promise<Buffer> {
    const currentYear = new Date().getFullYear();
    const options = {
      sheetName: `${currentYear} T4 Information`,
      fileName: `${currentYear}_t4_report.xlsx`,
    };

    const workbook = await this.createWorkbook(options);
    const worksheet = workbook.addWorksheet(options.sheetName);

    // Set headers
    worksheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 12 },
      { header: "Last Name", key: "lastName", width: 15 },
      { header: "First Name", key: "firstName", width: 15 },
      { header: "SIN", key: "sinNumber", width: 15 },
      { header: "Address", key: "address", width: 40 },
      { header: "Date of Birth", key: "dateOfBirth", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Resigned Date", key: "resignedDate", width: 15 },
    ];

    // Apply styles
    worksheet.getRow(1).font = { bold: true };

    // Query all employee data
    const employees = await this.employeeService.getEmployees({});

    // Format and add data
    const reportData = employees.data.map((employee) => ({
      employeeId: employee.id,
      lastName: employee.lastName,
      firstName: employee.firstName,
      sinNumber: formatSIN(employee.sinNumber),
      address: employee.address,
      dateOfBirth: formatDate(employee.dateOfBirth),
      status: employee.resignedDate ? "Resigned" : "Active",
      resignedDate: employee.resignedDate
        ? formatDate(employee.resignedDate)
        : "-",
    }));

    worksheet.addRows(reportData);

    // Add summary information
    const activeEmployees = reportData.filter(
      (emp) => emp.status === "Active"
    ).length;
    const resignedEmployees = reportData.filter(
      (emp) => emp.status === "Resigned"
    ).length;

    worksheet.addRow([]);
    worksheet.addRow(["Summary"]);
    worksheet.addRow(["Total Employees", reportData.length]);
    worksheet.addRow(["Active Employees", activeEmployees]);
    worksheet.addRow(["Resigned Employees", resignedEmployees]);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
