import { ArgsType, Field, ObjectType, PartialType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { CreateRestaurantInput } from './create-restaurant.dto';

@ArgsType()
export class EditRestaurantInput extends PartialType(
  CreateRestaurantInput,
  ArgsType,
) {
  @Field(() => Number)
  restaurantId: number;
}

@ObjectType()
export class EditRestaurantOutput extends CoreOutput {}
