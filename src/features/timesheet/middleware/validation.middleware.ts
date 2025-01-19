import { body, query } from "express-validator";
import { validate } from "@/features/employee/middleware/validation.middleware";

export const validateTimesheetInfos = {
  create: [
    body("employeeId")
      .isInt({ min: 1 })
      .withMessage("Valid employee ID is required"),
    body("startTime")
      .isISO8601()
      .withMessage("Start time must be a valid date"),
    body("endTime")
      .isISO8601()
      .withMessage("End time must be a valid date")
      .custom((endTime, { req }) => {
        if (new Date(endTime) <= new Date(req.body.startTime)) {
          throw new Error("End time must be after start time");
        }
        return true;
      }),
    body("regularHours")
      .isFloat({ min: 0 })
      .withMessage("Regular hours must be a positive number"),
    body("overtimeHours")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Overtime hours must be a positive number"),
  ],

  update: [
    body("startTime")
      .optional()
      .isISO8601()
      .withMessage("Start time must be a valid date"),
    body("endTime")
      .optional()
      .isISO8601()
      .withMessage("End time must be a valid date")
      .custom((endTime, { req }) => {
        if (
          req.body.startTime &&
          new Date(endTime) <= new Date(req.body.startTime)
        ) {
          throw new Error("End time must be after start time");
        }
        return true;
      }),
    body("regularHours")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Regular hours must be a positive number"),
    body("overtimeHours")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Overtime hours must be a positive number"),
  ],

  list: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be greater than or equal to 1"),
    query("limit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Limit must be greater than or equal to 1"),
    query("employeeId")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Employee ID must be a positive integer"),
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date")
      .custom((endDate, { req }) => {
        if (
          req.query.startDate &&
          new Date(endDate) <= new Date(req.query.startDate)
        ) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
  ],
};

export { validate };
