import { Router } from "express";
import { AuthController } from "../controller/auth.controller";
import { rateLimiter } from "../middleware/auth.middleware";
import { validate } from "@/features/employee/middleware/validation.middleware";
import { validateAuth } from "../middleware/validation.middleware";

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
