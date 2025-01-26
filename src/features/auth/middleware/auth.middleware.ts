import { UserRole } from "@/entities/User";
import { TokenPayload } from "@/shared/types/auth.types";
import { ForbiddenError, UnauthorizedError } from "@/shared/types/error.types";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import rateLimit from "express-rate-limit";

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

    const decoded = verify(token, process.env.JWT_SECRET!) as TokenPayload;
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
});
