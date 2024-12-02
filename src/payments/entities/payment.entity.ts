import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToOne, RelationId } from 'typeorm';

@InputType('PaymentInputType')
@ObjectType()
@Entity()
export class Payment extends CoreEntity {
  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.payments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user: User;

  @RelationId((payment: Payment) => payment.user)
  userId: number;

  @Field(() => String)
  @Column()
  transactionId: string;

  //식당용 정기결제를 위한 필드
  @Field(() => Restaurant, { nullable: true })
  @ManyToOne(() => Restaurant, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  restaurant?: Restaurant;

  @Field((type) => Int, { nullable: true })
  @RelationId((payment: Payment) => payment.restaurant)
  restaurantId?: number;
}
