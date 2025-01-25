import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./User";
import { Employee } from "./Employee";

@Entity("employee_users")
@Unique(["userId", "employeeId"])
export class EmployeeUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  employeeId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;
}
