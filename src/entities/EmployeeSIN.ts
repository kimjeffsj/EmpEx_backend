import {
  Column,
  CreateDateColumn,
  Entity,
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

@Entity("employee_sin")
export class EmployeeSIN {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @Column({ type: "varchar", length: 60 })
  encryptedFull: string; // Encrypted full SIN storage

  @Column({ type: "varchar", length: 3 })
  last3: string; // Last 3 digits

  @Column({ type: "varchar", length: 60 })
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
}
