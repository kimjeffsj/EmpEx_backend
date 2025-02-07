import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "./Employee";
import { User } from "./User";

@Entity("sin_access_logs")
export class SINAccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @Column()
  userId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: "employeeId" })
  employee: Employee;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 20 })
  accessType: "VIEW" | "T4_ACCESS";

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ type: "timestamptz" })
  accessedAt: Date;
}
