import { ArgsType, Field, Int, ObjectType, PickType } from '@nestjs/graphql';
import { Dish } from '../entities/dish.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class CreateDishInput extends PickType(
  Dish,
  ['name', 'photo', 'price', 'description', 'options'],
  ArgsType,
) {
  @Field(() => Int)
  restaurantId: number;
}

@ObjectType()
export class CreateDishOutput extends CoreOutput {}
