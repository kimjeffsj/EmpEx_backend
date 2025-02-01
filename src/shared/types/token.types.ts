import { Secret } from "jsonwebtoken";

export interface TokenConfig {
  accessToken: {
    secret: Secret;
    expiresIn: string; // '15m'
  };
  refreshToken: {
    secret: Secret;
    expiresIn: string; // '7d'
  };
}

export const TOKEN_CONFIG: TokenConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  },
};

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("JWT secrets are not configured in environment variables");
  process.exit(1);
}
