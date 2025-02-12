import { Router } from "express";
import { DashboardController } from "../controller/dashboard.controller";
import {
  authenticateJWT,
  authorizeRoles,
} from "@/features/auth/middleware/auth.middleware";
import { UserRole } from "@/entities/User";
import { DataSource } from "typeorm";

export const createDashboardRouter = (dataSource: DataSource): Router => {
  const router = Router();
  const dashboardController = new DashboardController(dataSource);

  /**
   * @swagger
   * /api/dashboard/manager/stats:
   *   get:
   *     summary: Get manager dashboard statistics
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard statistics retrieved successfully
   */
  router.get(
    "/manager/stats",
    authenticateJWT,
    authorizeRoles(UserRole.MANAGER),
    dashboardController.getManagerDashboardStats.bind(dashboardController)
  );

  /**
   * @swagger
   * /api/dashboard/employee/stats:
   *   get:
   *     summary: Get employee dashboard statistics
   *     tags: [Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Employee dashboard statistics retrieved successfully
   */
  router.get(
    "/employee/stats",
    authenticateJWT,
    authorizeRoles(UserRole.EMPLOYEE),
    dashboardController.getEmployeeDashboardStats.bind(dashboardController)
  );

  return router;
};
