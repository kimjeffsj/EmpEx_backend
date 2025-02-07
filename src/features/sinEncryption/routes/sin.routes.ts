import { Router } from "express";
import { SINController } from "../controller/sin.controller";
import {
  validate,
  validateSINInfos,
} from "../middleware/validation.middleware";
import {
  authenticateJWT,
  authorizeRoles,
} from "@/features/auth/middleware/auth.middleware";
import { UserRole } from "@/entities/User";
import { DataSource } from "typeorm";

export const createSINRouter = (dataSource: DataSource): Router => {
  const router = Router();
  const sinController = new SINController(dataSource);

  /**
   * @swagger
   * /api/sin:
   *   post:
   *     summary: Create new SIN record
   *     description: Create a new SIN record for an employee
   *     tags: [SIN]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateSINDto'
   *     responses:
   *       201:
   *         description: SIN record created successfully
   */
  router.post(
    "/",
    authenticateJWT,
    authorizeRoles(UserRole.MANAGER),
    validate(validateSINInfos.create),
    sinController.createSIN.bind(sinController)
  );

  /**
   * @swagger
   * /api/sin/{employeeId}:
   *   get:
   *     summary: Get SIN information
   *     description: Retrieve SIN information for an employee
   *     tags: [SIN]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: employeeId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: SIN information retrieved successfully
   */
  router.get(
    "/:employeeId",
    authenticateJWT,
    validate(validateSINInfos.get),
    sinController.getSIN.bind(sinController)
  );

  return router;
};
