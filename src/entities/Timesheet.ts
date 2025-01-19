import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("timesheets")
export class Timesheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("int")
  employeeId: number;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @Column("timestamp")
  startTime: Date;

  @Column("timestamp")
  endTime: Date;

  @Column("decimal", { precision: 5, scale: 2 })
  regularHours: number;

  @Column("decimal", { precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  @Column("decimal", { precision: 5, scale: 2 })
  totalHours: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalPay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
