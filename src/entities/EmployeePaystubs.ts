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
import { PayrollDocument } from "./PayrollDocument";

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
  payrollDocumentId: number;

  @ManyToOne(() => PayrollDocument, (document) => document.paystubs)
  @JoinColumn({ name: "payrollDocumentId" })
  payrollDocument: PayrollDocument;

  @Column()
  filePath: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
