import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql';
import { Order, OrderStatus } from '../entities/order.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';

@ArgsType()
export class GetOrdersInput extends PaginationInput {
  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;
}

@ObjectType()
export class GetOrdersOutput extends PaginationOutput {
  @Field(() => [Order], { nullable: true })
  orders?: Order[];
}
