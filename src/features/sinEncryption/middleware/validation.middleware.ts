import { body, param, query } from "express-validator";
import { validate } from "@/features/employee/middleware/validation.middleware";

export const validateSINInfos = {
  create: [
    body("employeeId")
      .isInt({ min: 1 })
      .withMessage("Valid employee ID is required"),
    body("sinNumber")
      .isString()
      .trim()
      .matches(/^\d{9}$/)
      .withMessage("SIN must be a 9-digit number"),
  ],

  get: [
    param("employeeId")
      .isInt({ min: 1 })
      .withMessage("Valid employee ID is required"),
    query("accessType")
      .optional()
      .isIn(["VIEW", "ADMIN_ACCESS"])
      .withMessage("Invalid access type"),
  ],
};

export { validate };
