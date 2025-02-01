import { UserRole } from "@/entities/User";
import { TokenPayload } from "@/shared/types/auth.types";
import { ForbiddenError, UnauthorizedError } from "@/shared/types/error.types";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { AuthService } from "../service/auth.service";
import { getDataSource } from "@/app/config/data-source";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError();
    }

    // Check token blacklist
    const authService = new AuthService(getDataSource());
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token has been invalidated");
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as TokenPayload;

    // Enhanced token expiration time validation
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTimestamp) {
      throw new UnauthorizedError("Token has expired");
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError());
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      throw new ForbiddenError();
    }
    next();
  };
};

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login Rate limiter
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  // Maximum login attempts per IP
  message: {
    code: "LOGIN_ATTEMPT_EXCEEDED",
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
