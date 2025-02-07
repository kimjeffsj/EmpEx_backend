import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

export enum SINAccessLevel {
  EMPLOYEE = "EMPLOYEE", // Can only view the last 3 digits of SIN
  MANAGER = "MANAGER", // For T4, full SIN number can be viewed
}

interface EncryptedSINData {
  iv: string;
  content: string;
  authTag: string;
}

@Entity("employee_sin")
@Index(["employeeId", "searchHash"])
export class EmployeeSIN {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  employeeId: number;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @Column({ type: "jsonb" })
  encryptedData: EncryptedSINData;

  @Column({ type: "varchar", length: 3 })
  last3: string; // Last 3 digits

  @Column({ type: "varchar", length: 60 })
  @Index()
  searchHash: string; // Search hash

  @Column({
    type: "enum",
    enum: SINAccessLevel,
    default: SINAccessLevel.EMPLOYEE,
  })
  accessLevel: SINAccessLevel;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  // Data validation
  @BeforeInsert()
  @BeforeUpdate()
  validateData() {
    if (this.last3 && !/^\d{3}$/.test(this.last3)) {
      throw new Error("Last 3 digits must be numeric");
    }

    if (
      !this.encryptedData?.iv ||
      !this.encryptedData?.content ||
      !this.encryptedData?.authTag
    ) {
      throw new Error("Invalid encrypted data structure");
    }
  }

  // Non-sensitive EmployeeSIN data (excluding encrypted credentials)
  toPublicView(): Partial<EmployeeSIN> {
    return {
      id: this.id,
      employeeId: this.employeeId,
      last3: this.last3,
      accessLevel: this.accessLevel,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Sensitive EmployeeSIN data
  toAdminView(): Partial<EmployeeSIN> {
    return {
      ...this.toPublicView(),
      encryptedData: this.encryptedData,
    };
  }
}
