import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { IsEmail, IsEnum, IsString } from 'class-validator';

enum UserRole {
  Client,
  Owner,
  Delivery,
}
registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
@Entity()
export class User extends CoreEntity {
  @Field(() => String)
  @Column()
  @IsEmail()
  email: string;

  @Field(() => String)
  @Column()
  @IsString()
  password: string;

  @Field(() => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(); // 여기서 발생한 에러는 service.ts에 repostory가 inject 되기 때문에 거기서 처리해준다
    }
  }

  async checkPassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(); // 여기서 발생한 에러는 service.ts에 repostory가 inject 되기 때문에 거기서 처리해준다
    }
  }
}
