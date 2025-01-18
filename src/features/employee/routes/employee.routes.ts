import { Router } from "express";
import { EmployeeController } from "../controller/employee.controller";
import {
  validate,
  validateEmployeeInfos,
} from "../middleware/validation.middleware";

export const employeeRouter = Router();
const employeeController = new EmployeeController();

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     description: Retrieve a list of employees with pagination, sorting and filtering options
 *     tags: [Employees]
 *     parameters:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering employees
 *       - in: query
 *         name: isResigned
 *         schema:
 *           type: boolean
 *         description: Filter by resignation status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, firstName, lastName, email, startDate, resignedDate]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: A paginated list of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
employeeRouter.get(
  "/",
  validate(validateEmployeeInfos.list),
  employeeController.getEmployees.bind(employeeController)
);

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create a new employee
 *     description: Add a new employee to the system
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - sinNumber
 *               - address
 *               - email
 *               - dateOfBirth
 *               - payRate
 *               - startDate
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               sinNumber:
 *                 type: string
 *                 pattern: ^\d{9}$
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               payRate:
 *                 type: number
 *                 minimum: 17.5
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
employeeRouter.post(
  "/",
  validate(validateEmployeeInfos.create),
  employeeController.createEmployee.bind(employeeController)
);

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Retrieve a specific employee's details
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
employeeRouter.get(
  "/:id",
  employeeController.getEmployee.bind(employeeController)
);

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update employee
 *     description: Update an existing employee's information
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               sinNumber:
 *                 type: string
 *                 pattern: ^\d{9}$
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               payRate:
 *                 type: number
 *                 minimum: 17.5
 *               resignedDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
employeeRouter.put(
  "/:id",
  validate(validateEmployeeInfos.update),
  employeeController.updateEmployee.bind(employeeController)
);

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     description: Delete an employee from the system
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       204:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
employeeRouter.delete(
  "/:id",
  employeeController.deleteEmployee.bind(employeeController)
);
