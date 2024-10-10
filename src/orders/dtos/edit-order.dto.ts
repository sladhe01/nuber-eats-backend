import { ArgsType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Order } from '../entities/order.entity';

@ArgsType()
export class EditOrderInput extends PickType(
  Order,
  ['id', 'status'],
  ArgsType,
) {}

@ObjectType()
export class EditOrderOutput extends CoreOutput {}
