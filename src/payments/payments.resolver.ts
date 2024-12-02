import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payments.service';
import { Role } from 'src/auth/role.decorator';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { User } from 'src/users/entities/user.entity';
import {
  CreateRestaurantPaymentInput,
  CreateRestaurantPaymentOutput,
} from './dtos/create-restaurant-payment.dto';
import {
  GetRestaurantPaymentsInput,
  GetRestaurantPaymentsOutput,
} from './dtos/get-restaurant-payments.dto';

@Resolver((of) => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation((returns) => CreateRestaurantPaymentOutput)
  @Role(['Owner'])
  createRestaurantPayment(
    @AuthUser() owner: User,
    @Args() createRestaurantPaymentInput: CreateRestaurantPaymentInput,
  ): Promise<CreateRestaurantPaymentOutput> {
    return this.paymentService.createRestaurantPayment(
      owner,
      createRestaurantPaymentInput,
    );
  }

  @Query((returns) => GetRestaurantPaymentsOutput)
  @Role(['Owner'])
  getRestaurantPayments(
    @AuthUser() user: User,
    @Args() getRestaurantPaymentsInput: GetRestaurantPaymentsInput,
  ): Promise<GetRestaurantPaymentsOutput> {
    return this.paymentService.getRestaurantPayments(
      user,
      getRestaurantPaymentsInput,
    );
  }
}
