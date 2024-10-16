import { ArgsType, ObjectType, PickType } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class TakeOrderInput extends PickType(Order, ['id'], ArgsType) {}

@ObjectType()
export class TakeOrderOutput extends CoreOutput {}
