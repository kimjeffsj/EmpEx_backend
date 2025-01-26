import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User, UserRole } from "./User";
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

  @ManyToOne(() => User, (user) => user.employeeUsers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Employee, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  // Validate user role before insert/update
  async validateUserRole() {
    if (this.user && this.user.role !== UserRole.EMPLOYEE) {
      throw new Error("Only employees can be associated with employee records");
    }
  }
}
