import { Field, ObjectType } from '@nestjs/graphql';
import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity()
export class CoreEntity {
  @Field(() => Number)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => Date)
  @DeleteDateColumn()
  deletedAt: Date;
}
