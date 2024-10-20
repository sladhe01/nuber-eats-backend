import { ArgsType, ObjectType, PickType } from '@nestjs/graphql';
import { PaddlePayment } from '../entities/payment.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class CreateRestaurantPaymentInput extends PickType(
  PaddlePayment,
  ['transactionId', 'restaurantId'],
  ArgsType,
) {}

@ObjectType()
export class CreateRestaurantPaymentOutput extends CoreOutput {}
