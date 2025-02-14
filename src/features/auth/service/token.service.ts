import { TokenBlacklist } from "@/entities/TokenBlacklist";
import { UserRole } from "@/entities/User";
import { TokenPayload, TokenResult } from "@/shared/types/auth.types";
import { UnauthorizedError } from "@/shared/types/error.types";
import { Response } from "express";
import { sign, verify } from "jsonwebtoken";
import { Repository } from "typeorm";

export class TokenService {
  constructor(
    private tokenBlacklistRepository: Repository<TokenBlacklist>,
    private readonly ACCESS_TOKEN_SECRET: string,
    private readonly REFRESH_TOKEN_SECRET: string
  ) {}

  async generateTokens(payload: {
    id: number;
    email: string;
    role: UserRole;
    employeeId?: number;
  }): Promise<TokenResult> {
    const accessToken = sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
    });

    const refreshTokenId = crypto.randomUUID();
    const refreshToken = sign(
      { ...payload, refreshTokenId },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      payload,
    };
  }

  async rotateRefreshToken(oldRefreshToken: string): Promise<TokenResult> {
    try {
      const decoded = verify(
        oldRefreshToken,
        this.REFRESH_TOKEN_SECRET
      ) as TokenPayload & { refreshTokenId: string };

      await this.blacklistToken(oldRefreshToken, decoded.exp!);

      return this.generateTokens({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        employeeId: decoded.employeeId,
      });
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async blacklistToken(token: string, expiresAt: number): Promise<void> {
    await this.tokenBlacklistRepository.save({
      token,
      expiresAt: new Date(expiresAt * 1000),
    });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.tokenBlacklistRepository.findOne({
      where: { token },
    });
    return !!blacklistedToken;
  }

  setCookies(
    res: Response,
    { accessToken, refreshToken }: { accessToken: string; refreshToken: string }
  ) {
    // Set secure cookie settingse settings
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7days
    });
  }

  clearCookies(res: Response) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  }
}
