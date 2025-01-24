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
import { PayPeriod } from "./PayPeriod";
import { EmployeePaystub } from "./EmployeePaystubs";

export enum PayrollDocumentStatus {
  EXCEL_GENERATED = "EXCEL_GENERATED",
  SENT_TO_ACCOUNTANT = "SENT_TO_ACCOUNTANT",
  PDF_RECEIVED = "PDF_RECEIVED",
  SPLIT_COMPLETED = "SPLIT_COMPLETED",
}

@Entity("payroll_documents")
export class PayrollDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  payPeriodId: number;

  @ManyToOne(() => PayPeriod)
  @JoinColumn({ name: "payPeriodId" })
  payPeriod: PayPeriod;

  @Column({ nullable: true })
  excelFilePath: string;

  @Column({ nullable: true })
  originalPdfPath: string;

  @Column({
    type: "enum",
    enum: PayrollDocumentStatus,
    default: PayrollDocumentStatus.EXCEL_GENERATED,
  })
  status: PayrollDocumentStatus;

  @Column({ type: "timestamptz", nullable: true })
  sentDate: Date;

  @Column({ type: "timestamptz", nullable: true })
  receivedDate: Date;

  @OneToMany(() => EmployeePaystub, (paystub) => paystub.payrollDocument)
  paystubs: EmployeePaystub[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
