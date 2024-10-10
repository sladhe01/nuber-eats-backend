import {
  ArgsType,
  Field,
  Int,
  ObjectType,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Dish } from '../entities/dish.entity';

@ArgsType()
export class EditDishInput extends PartialType(
  PickType(
    Dish,
    ['name', 'options', 'photo', 'price', 'description'],
    ArgsType,
  ),
  ArgsType,
) {
  @Field(() => Int)
  dishId: number;
}

@ObjectType()
export class EditDishOutput extends CoreOutput {}
