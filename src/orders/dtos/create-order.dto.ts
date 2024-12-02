import {
  ArgsType,
  Field,
  InputType,
  Int,
  ObjectType,
  PickType,
} from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Order } from '../entities/order.entity';

@InputType()
class CreateOrderItemsOptionChoice {
  @Field(() => String)
  name: string;

  @Field(() => Int)
  extra: number;
}

@InputType()
class CreateOrderItemOption {
  @Field(() => String)
  name: string;

  @Field(() => [CreateOrderItemsOptionChoice])
  choices: CreateOrderItemsOptionChoice[];
}

@InputType()
export class CreateOrderItem {
  @Field(() => Int)
  dishId: number;

  @Field(() => [CreateOrderItemOption], { nullable: true })
  options?: CreateOrderItemOption[];
}

@ArgsType()
export class CreateOrderInput {
  @Field(() => Int)
  restaurantId: number;

  @Field(() => [CreateOrderItem])
  items: CreateOrderItem[];
}

@ObjectType()
export class CreateOrderOutput extends CoreOutput {
  @Field((type) => Int, { nullable: true })
  orderId?: number;
}
