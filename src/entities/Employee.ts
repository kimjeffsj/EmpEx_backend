import { UpdateDateColumn } from "typeorm";
import { CreateDateColumn } from "typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  firstName: string;

  @Column({ length: 50 })
  lastName: string;

  @Column({ length: 20, unique: true })
  sinNumber: string;

  @Column("text")
  address: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column("date")
  dateOfBirth: Date;

  @Column("decimal", { precision: 10, scale: 2 })
  payRate: number;

  @Column("date")
  startDate: Date;

  @Column("date", { nullable: true })
  resignedDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column("boolean", { default: false, select: false })
  isResigned?: boolean;
}
