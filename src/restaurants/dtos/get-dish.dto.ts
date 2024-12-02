import { ArgsType, Field, ObjectType, PickType } from '@nestjs/graphql';
import { Dish } from '../entities/dish.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class GetDishInput extends PickType(Dish, ['id'], ArgsType) {}

@ObjectType()
export class GetDishOutput extends CoreOutput {
  @Field(() => Dish, { nullable: true })
  dish?: Dish;
}
