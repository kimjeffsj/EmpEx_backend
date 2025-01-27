import { Router } from "express";
import { AuthController } from "../controller/auth.controller";
import {
  rateLimiter,
  authenticateJWT,
  authorizeRoles,
} from "../middleware/auth.middleware";
import { validate } from "@/features/employee/middleware/validation.middleware";
import { validateAuth } from "../middleware/validation.middleware";
import { UserRole } from "@/entities/User";

export const authRouter = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 */
authRouter.post(
  "/login",
  rateLimiter,
  validate(validateAuth.login),
  authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
authRouter.post(
  "/refresh",
  rateLimiter,
  validate(validateAuth.refresh),
  authController.refreshToken.bind(authController)
);

/**
 * @swagger
 * /api/auth/employee-accounts:
 *   post:
 *     summary: Create employee account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - email
 *               - password
 *             properties:
 *               employeeId:
 *                 type: integer
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Employee account created successfully
 */
authRouter.post(
  "/employee-accounts",
  authenticateJWT,
  authorizeRoles(UserRole.MANAGER),
  validate(validateAuth.createEmployeeAccount),
  authController.createEmployeeAccount.bind(authController)
);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   put:
 *     summary: Update user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               password:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
authRouter.put(
  "/users/:id",
  authenticateJWT,
  authorizeRoles(UserRole.MANAGER),
  validate(validateAuth.updateUser),
  authController.updateUser.bind(authController)
);
