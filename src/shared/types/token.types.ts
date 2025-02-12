import { Secret } from "jsonwebtoken";

export interface TokenConfig {
  accessToken: {
    secret: Secret;
    expiresIn: "15m";
  };
  refreshToken: {
    secret: Secret;
    expiresIn: "7d";
  };
}

export const TOKEN_CONFIG: TokenConfig = {
  accessToken: {
    secret: process.env.JWT_SECRET,
    expiresIn: "15m",
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: "7d",
  },
};

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("JWT secrets are not configured in environment variables");
  process.exit(1);
}
