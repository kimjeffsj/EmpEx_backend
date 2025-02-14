import { UserRole } from "@/entities/User";
import { TokenPayload } from "@/shared/types/auth.types";
import { ForbiddenError, UnauthorizedError } from "@/shared/types/error.types";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { TokenService } from "../service/token.service";
import { getDataSource } from "@/app/config/data-source";
import { TOKEN_CONFIG } from "@/shared/types/auth.types";
import { TokenBlacklist } from "@/entities/TokenBlacklist";
import { AuthService } from "../service/auth.service";

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
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      throw new UnauthorizedError("No access token provided");
    }

    const dataSource = getDataSource();
    const tokenService = new TokenService(
      dataSource.getRepository(TokenBlacklist),
      TOKEN_CONFIG.accessToken.secret,
      TOKEN_CONFIG.refreshToken.secret
    );

    const isBlacklisted = await tokenService.isTokenBlacklisted(accessToken);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token has been invalidated");
    }

    const decoded = verify(
      accessToken,
      TOKEN_CONFIG.accessToken.secret
    ) as TokenPayload;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTimestamp) {
      throw new UnauthorizedError("Token has expired");
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return await attemptTokenRefresh(req, res, next);
    }
    next(new UnauthorizedError("Authentication failed"));
  }
};

const attemptTokenRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError("No refresh token available");
    }

    const dataSource = getDataSource();
    const tokenService = new TokenService(
      dataSource.getRepository(TokenBlacklist),
      TOKEN_CONFIG.accessToken.secret,
      TOKEN_CONFIG.refreshToken.secret
    );

    // Token renewal
    const authService = new AuthService(dataSource);
    const authResponse = await authService.refreshToken(refreshToken);

    // Update cookies with new tokens
    tokenService.setCookies(res, {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    });

    // Set new user information
    req.user = {
      id: authResponse.user.id,
      email: authResponse.user.email,
      role: authResponse.user.role,
      employeeId: authResponse.user.employeeId,
    };

    next();
  } catch (error) {
    // Remove cookies on refresh failure
    const dataSource = getDataSource();
    const tokenService = new TokenService(
      dataSource.getRepository(TokenBlacklist),
      TOKEN_CONFIG.accessToken.secret,
      TOKEN_CONFIG.refreshToken.secret
    );
    tokenService.clearCookies(res);
    next(new UnauthorizedError("Authentication failed"));
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    next();
  };
};

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: {
    code: "LOGIN_ATTEMPT_EXCEEDED",
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
