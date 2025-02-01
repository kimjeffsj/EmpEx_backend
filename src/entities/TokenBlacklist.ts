import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity("token_blacklist")
@Index(["token"], { unique: true })
@Index(["expiresAt"])
// Tokens registered in the blacklist can no longer be used.
export class TokenBlacklist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  token: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  // Check if token is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
