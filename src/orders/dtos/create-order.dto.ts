import { ArgsType, Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { DishChoice } from 'src/restaurants/entities/dish.entity';

@InputType()
class CreateOrderItemOption {
  @Field(() => String)
  name: string;

  @Field(() => [String])
  choices: String[];
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
export class CreateOrderOutput extends CoreOutput {}
