import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EmployeeUser } from "./EmployeeUser";

export enum UserRole {
  MANAGER = "MANAGER",
  EMPLOYEE = "EMPLOYEE",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ length: 50 })
  first_name: string;

  @Column({ length: 50 })
  last_name: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "timestamptz", nullable: true })
  last_login: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @OneToMany(() => EmployeeUser, (employeeUser) => employeeUser.user)
  employeeUsers: EmployeeUser[];

  // Type guard for Manager
  isManager(): this is User & { role: UserRole.MANAGER } {
    return this.role === UserRole.MANAGER;
  }

  // Type guard for Employee
  isEmployee(): this is User & { role: UserRole.EMPLOYEE } {
    return this.role === UserRole.EMPLOYEE;
  }

  @BeforeInsert()
  @BeforeUpdate()
  validateRole() {
    if (!this.id && this.role === UserRole.EMPLOYEE) {
      return;
    }

    // Check only when updating
    if (
      this.id &&
      this.role === UserRole.EMPLOYEE &&
      !this.employeeUsers?.length
    ) {
      throw new Error(
        "Employee user must be associated with an employee record"
      );
    }
  }
}
