import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "./Employee";
import { PayPeriod } from "./PayPeriod";

@Entity("employee_paystubs")
export class EmployeePaystub {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => Employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @Column()
  payPeriodId: number;

  @ManyToOne(() => PayPeriod)
  @JoinColumn({ name: "payPeriodId" })
  payPeriod: PayPeriod;

  @Column()
  filePath: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
