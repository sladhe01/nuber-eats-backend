import { ArgsType, Field, ObjectType } from '@nestjs/graphql';
import { CommonPayment } from '../entities/payment.entity';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';

@ArgsType()
export class GetRestaurantPaymentsInput extends PaginationInput {}

@ObjectType()
export class GetRestaurantPaymentsOutput extends PaginationOutput {
  @Field((type) => [CommonPayment], { nullable: true })
  payments?: CommonPayment[];
}
