import { ArgsType, Field, Int, ObjectType, PickType } from '@nestjs/graphql';
import { Restaurant } from '../entities/restaurant.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class CreateRestaurantInput extends PickType(
  Restaurant,
  ['name', 'coverImg', 'address'],
  ArgsType,
) {
  @Field(() => String)
  categoryName: string;
}

@ObjectType()
export class CreateRestaurantOutput extends CoreOutput {
  @Field((type) => Int, { nullable: true })
  restaurantId?: number;
}
