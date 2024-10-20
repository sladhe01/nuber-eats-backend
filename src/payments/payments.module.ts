import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CommonPayment,
  NaverPayment,
  PaddlePayment,
} from './entities/payment.entity';
import { PaymentService } from './payments.service';
import { PaymentResolver } from './payments.resolver';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommonPayment,
      NaverPayment,
      PaddlePayment,
      Restaurant,
    ]),
  ],
  providers: [PaymentService, PaymentResolver],
})
export class PaymentsModule {}
