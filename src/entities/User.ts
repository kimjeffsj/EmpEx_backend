import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

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
  password_has: string;

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

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @Column({ type: "timestamptz", nullable: true })
  last_login: Date;
}
