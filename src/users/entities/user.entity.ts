import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { IsBoolean, IsEmail, IsEnum, IsString } from 'class-validator';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Order } from 'src/orders/entities/order.entity';

export enum UserRole {
  Client = 'Client',
  Owner = 'Owner',
  Delivery = 'Delivery',
}
registerEnumType(UserRole, { name: 'UserRole' });

@InputType('UserInputType') //따로 명명값을 주지 않으면 ObejectType과 구분못하기 때문에 같이 쓸 때는 필히 적어줘야한다.
@ObjectType()
@Entity()
export class User extends CoreEntity {
  @Field(() => String)
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Field(() => String)
  @Column({ select: false })
  @IsString()
  password: string;

  @Field(() => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @Field(() => Boolean, { defaultValue: false })
  @Column({ default: false })
  @IsBoolean()
  verified: boolean;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.owner, {
    nullable: true,
  })
  @Field(() => [Restaurant], { nullable: true })
  restaurants?: Restaurant[];

  @OneToMany(() => Order, (order) => order.customer, { nullable: true })
  orders?: Order[];

  @OneToMany(() => Order, (ride) => ride.driver, { nullable: true })
  rides?: Order[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      try {
        this.password = await bcrypt.hash(this.password, 10);
      } catch (e) {
        throw new InternalServerErrorException(); // 여기서 발생한 에러는 service.ts에 repostory가 inject 되기 때문에 거기서 처리해준다
      }
    }
  }

  async checkPassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (e) {
      throw new InternalServerErrorException(); // 여기서 발생한 에러는 service.ts에 repostory가 inject 되기 때문에 거기서 처리해준다
    }
  }
}
