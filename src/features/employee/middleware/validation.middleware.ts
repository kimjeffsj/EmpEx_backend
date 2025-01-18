import { NextFunction, Request, Response } from "express";
import {
  body,
  query,
  ValidationChain,
  validationResult,
} from "express-validator";

export const validateEmployeeInfos = {
  // Required field validation
  create: [
    body("firstName").trim().notEmpty().withMessage("First Name is required"),
    body("lastName").trim().notEmpty().withMessage("Last Name is required"),
    body("sinNumber")
      .trim()
      .notEmpty()
      .withMessage("SIN number is required")
      .matches(/^\d{9}$/) // 9 digits numbers
      .withMessage("Invalid SIN number format"),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email address"),
    body("dateOfBirth").isISO8601().withMessage("Enter a Valid Date of Birth"), // "2024-03-15" "2024-03-15T09:30:00Z" "2024-03-15T09:30:00.000Z" format
    body("payRate")
      .isFloat({ min: 17.5 })
      .withMessage("Minimum wage is $17.50"),
    body("startDate").isISO8601().withMessage("Enter a Valid Start Date"), // "2024-03-15" "2024-03-15T09:30:00Z" "2024-03-15T09:30:00.000Z" format
  ],
  update: [
    // Optional field validation
    body("firstName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("First Name cannot be empty"),
    body("lastName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Last Name cannot be empty"),
    body("email")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Enter a valid email address"),
    body("payRate")
      .optional()
      .isFloat({ min: 17.5 })
      .withMessage("Minimum wage is $17.50"),
    body("resignedDate")
      .optional()
      .isISO8601()
      .withMessage("Enter a Valid Resigned Date"),
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
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("Sort order must be either ASC or DESC"),
  ],
};

export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Failed to validate",
      details: errors.array(),
    });
  };
};
