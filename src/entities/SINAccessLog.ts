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
  accessType: "ADMIN_ACCESS";

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ type: "timestamptz" })
  accessedAt: Date;

  constructor(partial: Partial<SINAccessLog>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  toEmployeeView(): Partial<SINAccessLog> {
    return {
      id: this.id,
      employeeId: this.employeeId,
      accessType: this.accessType,
      accessedAt: this.accessedAt,
    };
  }

  toAdminView(): Partial<SINAccessLog> {
    return {
      ...this.toEmployeeView(),
      userId: this.userId,
      ipAddress: this.ipAddress,
      user: this.user,
    };
  }
}
