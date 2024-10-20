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
class CreateOrderItemOption {
  @Field(() => String)
  name: string;

  @Field(() => [String])
  choices: string[];
}

@InputType()
export class CreateOrderItem {
  @Field(() => Int)
  dishId: number;

  @Field(() => [CreateOrderItemOption], { nullable: true })
  options?: CreateOrderItemOption[];
}

@ArgsType()
export class CreateOrderInput extends PickType(
  Order,
  ['destination'],
  ArgsType,
) {
  @Field(() => Int)
  restaurantId: number;

  @Field(() => [CreateOrderItem])
  items: CreateOrderItem[];
}

@ObjectType()
export class CreateOrderOutput extends CoreOutput {}
