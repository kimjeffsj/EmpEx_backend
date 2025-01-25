import { Router } from "express";
import { PayrollController } from "../controller/payroll.controller";
import {
  validate,
  validatePayPeriodInfos,
} from "../middleware/validation.middleware";

export const payrollRouter = Router();
const payrollController = new PayrollController();

/**
 * @swagger
 * /api/payrolls/periods:
 *   post:
 *     summary: Create or get a pay period
 *     description: Create a new pay period or get existing one with option to force recalculation
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - periodType
 *               - year
 *               - month
 *             properties:
 *               periodType:
 *                 type: string
 *                 enum: [FIRST_HALF, SECOND_HALF]
 *                 description: Type of pay period
 *               year:
 *                 type: integer
 *                 minimum: 2020
 *                 description: Year for the pay period
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 description: Month for the pay period
 *               forceRecalculate:
 *                 type: boolean
 *                 description: Force recalculation of existing pay period
 *                 default: false
 *     responses:
 *       201:
 *         description: Pay period created or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPeriod'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
payrollRouter.post(
  "/periods",
  validate(validatePayPeriodInfos.create),
  payrollController.createPayPeriod.bind(payrollController)
);

/**
 * @swagger
 * /api/payrolls/periods/{id}:
 *   get:
 *     summary: Get pay period by ID
 *     description: Retrieve detailed information about a specific pay period
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pay period ID
 *     responses:
 *       200:
 *         description: Pay period details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPeriod'
 *       404:
 *         description: Pay period not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
payrollRouter.get(
  "/periods/:id",
  payrollController.getPayPeriod.bind(payrollController)
);

/**
 * @swagger
 * /api/payrolls/periods:
 *   get:
 *     summary: Get all pay periods
 *     description: Retrieve a list of pay periods with filtering options
 *     tags: [Payroll]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PROCESSING, COMPLETED]
 *         description: Filter by status
 *       - in: query
 *         name: periodType
 *         schema:
 *           type: string
 *           enum: [FIRST_HALF, SECOND_HALF]
 *         description: Filter by period type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of pay periods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PayPeriod'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
payrollRouter.get(
  "/periods",
  validate(validatePayPeriodInfos.list),
  payrollController.getPayPeriods.bind(payrollController)
);

/**
 * @swagger
 * /api/payrolls/periods/{id}/complete:
 *   post:
 *     summary: Complete a pay period
 *     description: Mark a pay period as completed
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pay period ID
 *     responses:
 *       200:
 *         description: Pay period completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPeriod'
 *       400:
 *         description: Pay period already completed or invalid state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Pay period not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
payrollRouter.post(
  "/periods/:id/complete",
  payrollController.completePayPeriod.bind(payrollController)
);

/**
 * @swagger
 * /api/payrolls/periods/{id}/excel:
 *   get:
 *     summary: Export payroll report to Excel
 *     description: Generate and download a payroll report for a specific pay period
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pay period ID
 *     responses:
 *       200:
 *         description: Excel file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Pay period not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
payrollRouter.get(
  "/periods/:id/excel",
  payrollController.exportPayrollToExcel.bind(payrollController)
);

/**
 * @swagger
 * /api/payrolls/t4:
 *   get:
 *     summary: Export T4 basic information report
 *     description: Generate and download T4 basic information report for all employees
 *     tags: [Payroll]
 *     responses:
 *       200:
 *         description: Excel file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
payrollRouter.get(
  "/t4",
  payrollController.exportT4BasicInfo.bind(payrollController)
);
