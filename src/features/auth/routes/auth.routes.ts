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
import { DataSource } from "typeorm";

export const createAuthRouter = (dataSource: DataSource): Router => {
  const router = Router();
  const authController = new AuthController(dataSource);

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
  router.post(
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
  router.post(
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
  router.post(
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
  router.put(
    "/users/:id",
    authenticateJWT,
    authorizeRoles(UserRole.MANAGER),
    validate(validateAuth.updateUser),
    authController.updateUser.bind(authController)
  );

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: User logout
   *     description: |
   *       Logs out the current user and updates their last logout time.
   *       Requires a valid JWT token.
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Successfully logged out
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: string
   *                   example: "LOGOUT_SUCCESS"
   *                 message:
   *                   type: string
   *                   example: "Successfully logged out"
   *                 details:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: integer
   *                       example: 1
   *                     logoutTime:
   *                       type: string
   *                       format: date-time
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    "/logout",
    authenticateJWT,
    authController.logout.bind(authController)
  );

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current user information
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user information retrieved successfully
   *       401:
   *         description: Not authenticated
   */
  router.get(
    "/me",
    authenticateJWT,
    authController.getCurrentUser.bind(authController)
  );

  return router;
};
