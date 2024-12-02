import { ArgsType, ObjectType, PickType } from '@nestjs/graphql';
import { Payment } from '../entities/payment.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class CreateRestaurantPaymentInput extends PickType(
  Payment,
  ['transactionId', 'restaurantId'],
  ArgsType,
) {}

@ObjectType()
export class CreateRestaurantPaymentOutput extends CoreOutput {}
