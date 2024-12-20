import { Field, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Restaurant } from '../entities/restaurant.entity';

@ObjectType()
export class MyrestaurantsOutput extends CoreOutput {
  @Field((type) => [Restaurant])
  restaurants?: Restaurant[];
}
