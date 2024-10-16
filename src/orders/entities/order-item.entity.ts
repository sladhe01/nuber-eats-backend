import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Dish, DishChoice } from 'src/restaurants/entities/dish.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Order } from './order.entity';

@InputType('OrderItemOptionInputType')
@ObjectType()
export class OrderItemOption {
  @Field(() => String)
  name: string;

  @Field(() => [DishChoice])
  choices: DishChoice[];
}

@InputType('OrderItemInputType')
@ObjectType()
@Entity()
export class OrderItem extends CoreEntity {
  @ManyToOne(() => Dish, { nullable: false, onDelete: 'SET NULL', eager: true })
  @Field(() => Dish)
  dish: Dish;

  @Column({ type: 'json', nullable: true })
  @Field(() => [OrderItemOption], { nullable: true })
  options?: OrderItemOption[];

  @ManyToOne(() => Order, (order) => order.items)
  order: Order;
}
