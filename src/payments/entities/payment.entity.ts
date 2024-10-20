import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  RelationId,
} from 'typeorm';

@InputType('PaddleInputType')
@ObjectType()
@Entity()
export class PaddlePayment extends CoreEntity {
  // Paddle 전용 필드들...
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
  @RelationId((payment: PaddlePayment) => payment.restaurant)
  restaurantId?: number;
}

@InputType('NapyInputType')
@ObjectType()
@Entity()
export class NaverPayment extends CoreEntity {
  // 네이버페이 전용 필드들...
  @Field(() => String)
  @Column()
  paymentId: string;
}

@InputType('CommonPaymentInputType')
@ObjectType()
@Entity()
export class CommonPayment extends CoreEntity {
  //공통필드
  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.payments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user: User;

  @RelationId((payment: CommonPayment) => payment.user)
  userId: number;

  @OneToOne(() => PaddlePayment, { nullable: true })
  @JoinColumn()
  @Field((type) => PaddlePayment)
  paddlePayment?: PaddlePayment;

  @OneToOne(() => NaverPayment, { nullable: true })
  @JoinColumn()
  @Field((type) => NaverPayment)
  naverPayPayment?: NaverPayment;
}
