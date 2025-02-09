import { DataSource, QueryFailedError, Repository } from "typeorm";
import { EmployeeSIN, SINAccessLevel } from "@/entities/EmployeeSIN";
import {
  DatabaseError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/error.types";
import { Employee } from "@/entities/Employee";
import * as crypto from "crypto";
import { User, UserRole } from "@/entities/User";
import { SINAccessLog } from "@/entities/SINAccessLog";
import { EncryptedSINData, SINAccessType } from "@/shared/types/sin.types";

export class SINService {
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly ALGORITHM = "aes-256-gcm";
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly FIXED_SALT = process.env.SIN_HASH_SALT;

  private sinRepository: Repository<EmployeeSIN>;
  private employeeRepository: Repository<Employee>;
  private userRepository: Repository<User>;
  private sinAccessLogRepository: Repository<SINAccessLog>;

  constructor(private dataSource: DataSource) {
    this.sinRepository = dataSource.getRepository(EmployeeSIN);
    this.employeeRepository = dataSource.getRepository(Employee);
    this.userRepository = dataSource.getRepository(User);
    this.sinAccessLogRepository = dataSource.getRepository(SINAccessLog);

    // Initialize and verify encryption key
    const key = process.env.ENCRYPTION_KEY;
    if (!key || !this.FIXED_SALT) {
      throw new DatabaseError("Required encryption configuration missing");
    }

    // Expect Base64-encoded key
    this.ENCRYPTION_KEY = Buffer.from(key, "base64");
    if (this.ENCRYPTION_KEY.length !== this.KEY_LENGTH) {
      throw new DatabaseError("Invalid encryption key length");
    }
  }

  // Store SIN number
  async saveSIN(employeeId: number, sinNumber: string): Promise<EmployeeSIN> {
    // Validate SIN number using Luhn algorithm
    if (!this.validateSINWithLuhn(sinNumber)) {
      throw new ValidationError("Invalid SIN number");
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundError("Employee");
    }

    const existingSIN = await this.sinRepository.findOne({
      where: { employeeId },
    });

    if (existingSIN) {
      throw new ValidationError("SIN already exists for this employee");
    }

    // Extract last 3 digits
    const last3 = sinNumber.slice(-3);

    // Encrypt entire SIN (store with IV)
    const encryptedData = await this.encryptSIN(sinNumber);

    // Generate search hash with salting
    const searchHash = await this.generateSearchHash(sinNumber);

    const sinData = this.sinRepository.create({
      employeeId,
      encryptedData,
      last3,
      searchHash,
      accessLevel: SINAccessLevel.EMPLOYEE,
    });

    return await this.sinRepository.save(sinData);
  }

  // Retrieve SIN number (based on permission)
  async getSIN(
    requestingUserId: number,
    employeeId: number,
    accessType: SINAccessType,
    ipAddress: string
  ): Promise<string> {
    try {
      const [sinData, requestingUser] = await Promise.all([
        this.sinRepository.findOne({ where: { employeeId } }),
        this.userRepository.findOne({ where: { id: requestingUserId } }),
      ]);

      if (!requestingUser) {
        throw new NotFoundError("User");
      }

      if (!sinData) {
        throw new NotFoundError("SIN");
      }

      if (!this.hasAccess(requestingUser, employeeId, accessType)) {
        throw new ForbiddenError("Insufficient permissions to access SIN data");
      }

      if (
        accessType === "ADMIN_ACCESS" &&
        requestingUser.role === UserRole.MANAGER
      ) {
        await this.logAccess(
          requestingUserId,
          employeeId,
          accessType,
          ipAddress
        );
        return await this.decryptSIN(sinData.encryptedData);
      }

      return `XXX-XXX-${sinData.last3}`;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new DatabaseError(`Error retrieving SIN: ${error.message}`);
      }
      throw error;
    }
  }

  // Encryption
  private async encryptSIN(sin: string): Promise<EncryptedSINData> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.ALGORITHM,
        this.ENCRYPTION_KEY,
        iv
      );

      const encrypted = Buffer.concat([
        cipher.update(sin, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString("base64"),
        content: encrypted.toString("base64"),
        authTag: authTag.toString("base64"),
      };
    } catch (error) {
      throw new DatabaseError(`Encryption error: ${error.message}`);
    }
  }

  // Decryption
  private async decryptSIN(encryptedData: EncryptedSINData): Promise<string> {
    try {
      const iv = Buffer.from(encryptedData.iv, "base64");
      const content = Buffer.from(encryptedData.content, "base64");
      const authTag = Buffer.from(encryptedData.authTag, "base64");

      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        this.ENCRYPTION_KEY,
        iv
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(content),
        decipher.final(),
      ]).toString("utf8");

      // Additional validation for decrypted SIN
      if (!this.validateSINWithLuhn(decrypted)) {
        throw new ValidationError("Decrypted SIN failed validation");
      }

      return decrypted;
    } catch (error) {
      throw new DatabaseError(`Decryption error: ${error.message}`);
    }
  }

  private async generateSearchHash(sin: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        sin,
        this.FIXED_SALT!,
        1000,
        64,
        "sha512",
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(derivedKey.toString("hex"));
        }
      );
    });
  }

  // Validate with Luhn
  private validateSINWithLuhn(sin: string): boolean {
    if (!/^\d{9}$/.test(sin)) return false;

    const digits = sin.split("").map(Number);
    let sum = 0;
    let alternate = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  }

  // Check user permissions
  private hasAccess(
    user: User,
    targetEmployeeId: number,
    accessType: SINAccessType
  ): boolean {
    // Manager can only access full
    if (user.role === UserRole.MANAGER && accessType === "ADMIN_ACCESS") {
      return true;
    }

    // Employee can only access their information
    if (accessType === "VIEW") {
      if (user?.id === targetEmployeeId) return true;
      const hasEmployeeAccess = user.employeeUsers?.some(
        (eu) => eu.employeeId === targetEmployeeId
      );
      return hasEmployeeAccess || false;
    }

    return false;
  }

  // Log access
  private async logAccess(
    userId: number,
    employeeId: number,
    accessType: SINAccessType,
    ipAddress: string
  ): Promise<void> {
    if (accessType === "ADMIN_ACCESS") {
      try {
        await this.sinAccessLogRepository.save({
          userId,
          employeeId,
          accessType,
          ipAddress,
          accessedAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to log SIN access:", error);
      }
    }
  }
}
