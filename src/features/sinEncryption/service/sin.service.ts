import { DataSource, Repository } from "typeorm";
import { EmployeeSIN, SINAccessLevel } from "@/entities/EmployeeSIN";
import {
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
      throw new Error("Required encryption configuration missing");
    }

    // Expect Base64-encoded key
    this.ENCRYPTION_KEY = Buffer.from(key, "base64");
    if (this.ENCRYPTION_KEY.length !== this.KEY_LENGTH) {
      throw new Error(`Encryption key must be ${this.KEY_LENGTH} bytes`);
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
    targetEmployeeId: number,
    accessType: SINAccessType,
    ipAddress: string
  ): Promise<string> {
    const sinData = await this.sinRepository.findOne({
      where: { employeeId: targetEmployeeId },
    });

    if (!sinData) {
      throw new NotFoundError("SIN data");
    }

    await this.logAccess(
      requestingUserId,
      targetEmployeeId,
      accessType,
      ipAddress
    );

    // Return full SIN for T4 access
    if (
      accessType === "ADMIN_ACCESS" &&
      (await this.isManager(requestingUserId))
    ) {
      return await this.decryptSIN(sinData.encryptedData);
    }

    // Return only last 3 digits for standard access
    if (
      requestingUserId === targetEmployeeId ||
      (await this.isManager(requestingUserId))
    ) {
      return `XXX-XXX-${sinData.last3}`;
    }

    throw new ForbiddenError("Access denied");
  }

  // Encryption
  private async encryptSIN(sin: string): Promise<EncryptedSINData> {
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
  }

  // Decryption
  private async decryptSIN(encryptedData: EncryptedSINData): Promise<string> {
    const iv = Buffer.from(encryptedData.iv, "base64");
    const content = Buffer.from(encryptedData.content, "base64");
    const authTag = Buffer.from(encryptedData.authTag, "base64");

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.ENCRYPTION_KEY,
      iv
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(content), decipher.final()]).toString(
      "utf8"
    );
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
  private async isManager(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return user?.role === UserRole.MANAGER;
  }

  // Log access
  private async logAccess(
    userId: number,
    employeeId: number,
    accessType: SINAccessType,
    ipAddress: string
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(SINAccessLog, {
        userId,
        employeeId,
        accessType,
        ipAddress,
        accessedAt: new Date(),
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Failed to log SIN access:", error);
    } finally {
      await queryRunner.release();
    }
  }
}
