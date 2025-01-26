import { body } from "express-validator";

export const validateAuth = {
  login: [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  refresh: [
    body("refreshToken")
      .isString()
      .notEmpty()
      .withMessage("Refresh token is required"),
  ],
};
