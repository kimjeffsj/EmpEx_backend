import { Router } from "express";
import { TimesheetController } from "../controller/timesheet.controller";
import {
  validate,
  validateTimesheetInfos,
} from "../middleware/validation.middleware";

export const timesheetRouter = Router();
const timesheetController = new TimesheetController();

/**
 * @swagger
 * /api/timesheets:
 *   post:
 *     summary: Create a new timesheet
 *     description: Add a new timesheet record
 *     tags: [Timesheets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - startTime
 *               - endTime
 *               - regularHours
 *             properties:
 *               employeeId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               regularHours:
 *                 type: number
 *                 minimum: 0
 *               overtimeHours:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Timesheet created successfully
 */
timesheetRouter.post(
  "/",
  validate(validateTimesheetInfos.create),
  timesheetController.createTimesheet.bind(timesheetController)
);

/**
 * @swagger
 * /api/timesheets/{id}:
 *   get:
 *     summary: Get timesheet by ID
 *     description: Retrieve a specific timesheet's details
 *     tags: [Timesheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timesheet details retrieved successfully
 */
timesheetRouter.get(
  "/:id",
  timesheetController.getTimesheet.bind(timesheetController)
);

/**
 * @swagger
 * /api/timesheets:
 *   get:
 *     summary: Get all timesheets
 *     description: Retrieve a list of timesheets with pagination and filtering options
 *     tags: [Timesheets]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of timesheets retrieved successfully
 */
timesheetRouter.get(
  "/",
  validate(validateTimesheetInfos.list),
  timesheetController.getTimesheets.bind(timesheetController)
);

/**
 * @swagger
 * /api/timesheets/{id}:
 *   put:
 *     summary: Update timesheet
 *     description: Update an existing timesheet record
 *     tags: [Timesheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               regularHours:
 *                 type: number
 *                 minimum: 0
 *               overtimeHours:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Timesheet updated successfully
 */
timesheetRouter.put(
  "/:id",
  validate(validateTimesheetInfos.update),
  timesheetController.updateTimesheet.bind(timesheetController)
);

/**
 * @swagger
 * /api/timesheets/{id}:
 *   delete:
 *     summary: Delete timesheet
 *     description: Delete an existing timesheet record
 *     tags: [Timesheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Timesheet deleted successfully
 */
timesheetRouter.delete(
  "/:id",
  timesheetController.deleteTimesheet.bind(timesheetController)
);
