import { body, query } from "express-validator";
import { validate } from "@/features/employee/middleware/validation.middleware";
import { PayPeriodType, PayPeriodStatus } from "@/entities/PayPeriod";

export const validatePayPeriodInfos = {
  create: [
    body("periodType")
      .isIn(Object.values(PayPeriodType))
      .withMessage("Invalid period type"),
    body("year")
      .isInt({ min: 2020 })
      .withMessage("Year must be 2020 or later")
      .custom((year) => {
        const currentYear = new Date().getFullYear();
        if (year > currentYear + 1) {
          throw new Error(
            "Cannot create pay period more than 1 year in advance"
          );
        }
        return true;
      }),
    body("month")
      .isInt({ min: 1, max: 12 })
      .withMessage("Month must be between 1 and 12"),
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
    query("status")
      .optional()
      .isIn(Object.values(PayPeriodStatus))
      .withMessage("Invalid status"),
    query("periodType")
      .optional()
      .isIn(Object.values(PayPeriodType))
      .withMessage("Invalid period type"),
  ],

  updateStatus: [
    body("status")
      .isIn(Object.values(PayPeriodStatus))
      .withMessage("Invalid status")
      .custom(async (status, { req }) => {
        // Status transition validation will be handled in the service layer
        return true;
      }),
  ],
};

export { validate };
