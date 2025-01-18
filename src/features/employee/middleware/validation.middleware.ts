import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";

export const validateCreateEmployee = [
  // Required field validation
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
  body("payRate").isFloat({ min: 17.5 }).withMessage("Minimum wage is $17.50"),
  body("startDate").isISO8601().withMessage("Enter a Valid Start Date"), // "2024-03-15" "2024-03-15T09:30:00Z" "2024-03-15T09:30:00.000Z" format

  // Validation process
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        detail: errors.array(),
      });
    }
    next();
  },
];

export const validateUpdateEmployee = [
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

  // Validation process
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Validation Failed",
        details: errors.array(),
      });
    }
    next();
  },
];
