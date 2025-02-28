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
import { Payroll } from "./Payroll";
import { PayPeriod } from "./PayPeriod";

@Entity("timesheets")
export class Timesheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("int")
  employeeId: number;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @Column("timestamptz")
  startTime: Date;

  @Column("timestamptz")
  endTime: Date;

  @Column("decimal", { precision: 5, scale: 2 })
  regularHours: number;

  @Column("decimal", { precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  @Column("decimal", { precision: 5, scale: 2 })
  totalHours: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalPay: number;

  @Column()
  payPeriodId: number;

  @ManyToOne(() => PayPeriod)
  @JoinColumn({ name: "payPeriodId" })
  payPeriod: PayPeriod;

  @Column({ nullable: true })
  payrollId: number;

  @ManyToOne(() => Payroll, (payroll) => payroll.timesheets)
  @JoinColumn({ name: "payrollId" })
  payroll: Payroll;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
