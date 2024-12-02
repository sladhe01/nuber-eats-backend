import { ArgsType, Field, ObjectType } from '@nestjs/graphql';
import { Payment } from '../entities/payment.entity';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';

@ArgsType()
export class GetRestaurantPaymentsInput extends PaginationInput {}

@ObjectType()
export class GetRestaurantPaymentsOutput extends PaginationOutput {
  @Field((type) => [Payment], { nullable: true })
  payments?: Payment[];
}
