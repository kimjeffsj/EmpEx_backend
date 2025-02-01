export interface TokenConfig {
  accessToken: {
    secret: string;
    expiresIn: string; // '15m'
  };
  refreshToken: {
    secret: string;
    expiresIn: string; // '7d'
  };
}

export interface DecodedToken {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
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
