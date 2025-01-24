import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Payroll } from "./Payroll";

export enum PayPeriodType {
  FIRST_HALF = "FIRST_HALF", // 1 - 15
  SECOND_HALF = "SECOND_HALF", // 16 - 31
}

export enum PayPeriodStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
}

@Entity("pay_periods")
export class PayPeriod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("date")
  startDate: Date;

  @Column("date")
  endDate: Date;

  @Column({
    type: "enum",
    enum: PayPeriodType,
  })
  periodType: PayPeriodType;

  @Column({
    type: "enum",
    enum: PayPeriodStatus,
    default: PayPeriodStatus.PENDING,
  })
  status: PayPeriodStatus;

  @OneToMany(() => Payroll, (payroll) => payroll.payPeriod)
  payrolls: Payroll[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @CreateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
