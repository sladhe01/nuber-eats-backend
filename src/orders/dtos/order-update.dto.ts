import { ArgsType, PickType } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';

@ArgsType()
export class OrderUpdatesInput extends PickType(Order, ['id'], ArgsType) {}
