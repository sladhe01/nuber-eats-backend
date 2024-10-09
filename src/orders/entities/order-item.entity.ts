import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Dish, DishOption } from 'src/restaurants/entities/dish.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

@InputType('OrderItemInputType')
@ObjectType()
@Entity()
export class OrderItem extends CoreEntity {
  @ManyToOne(() => Dish, { nullable: false, onDelete: 'SET NULL' })
  @Field(() => Dish)
  dish: Dish;

  @Column({ type: 'json', nullable: true })
  @Field(() => [DishOption], { nullable: true })
  options?: DishOption[];
}
