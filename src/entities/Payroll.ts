import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Employee } from "./Employee";
import { PayPeriod } from "./PayPeriod";
import { Timesheet } from "./Timesheet";

export enum PayrollStatus {
  DRAFT = "DRAFT",
  CONFIRMED = "CONFIRMED",
  SENT = "SENT",
  COMPLETED = "COMPLETED",
}

@Entity("payrolls")
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @Column()
  payPeriodId: number;

  @ManyToOne(() => PayPeriod, (PayPeriod) => PayPeriod.payrolls)
  @JoinColumn({ name: "payPeriod" })
  payPeriod: PayPeriod;

  @OneToMany(() => Timesheet, (timesheet) => timesheet.payroll)
  timesheets: Timesheet[];

  @Column("decimal", { precision: 10, scale: 2 })
  totalRegularHours: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalOvertimeHours: number;

  @Column("decimal", { precision: 10, scale: 2 })
  totalHours: number;

  @Column("decimal", { precision: 10, scale: 2 })
  grossPay: number;

  @Column({
    type: "enum",
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
