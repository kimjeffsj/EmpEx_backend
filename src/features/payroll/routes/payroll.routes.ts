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
 *     summary: Create a new pay period
 *     description: Create or get an existing pay period for specified year and month
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
 *     description: Retrieve a list of pay periods with optional filters
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
 *           enum: [PENDING, PROCESSING, COMPLETED]
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
 *         description: List of pay periods
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
 * /api/payrolls/periods/{id}/calculate:
 *   post:
 *     summary: Calculate payroll for a period
 *     description: Calculate payroll for all employees in the specified pay period
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
 *         description: Payroll calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPeriod'
 *       400:
 *         description: Invalid pay period status or validation error
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
  "/periods/:id/calculate",
  payrollController.calculatePeriodPayroll.bind(payrollController)
);

/**
 * @swagger
 * /api/payrolls/periods/{id}/status:
 *   put:
 *     summary: Update pay period status
 *     description: Update the status of a specific pay period
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pay period ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PROCESSING, COMPLETED]
 *                 description: New status for the pay period
 *     responses:
 *       200:
 *         description: Pay period status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPeriod'
 *       400:
 *         description: Invalid status
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
payrollRouter.put(
  "/periods/:id/status",
  validate(validatePayPeriodInfos.updateStatus),
  payrollController.updatePayPeriodStatus.bind(payrollController)
);
