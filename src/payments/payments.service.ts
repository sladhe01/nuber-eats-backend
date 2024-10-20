import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaddlePayment, CommonPayment } from './entities/payment.entity';
import { LessThan, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import {
  CreateRestaurantPaymentInput,
  CreateRestaurantPaymentOutput,
} from './dtos/create-restaurant-payment.dto';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import {
  GetRestaurantPaymentsInput,
  GetRestaurantPaymentsOutput,
} from './dtos/get-restaurant-payments.dto';
import { Cron, Interval, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(CommonPayment)
    private readonly commonPayments: Repository<CommonPayment>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(PaddlePayment)
    private readonly paddlePayments: Repository<PaddlePayment>,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async createRestaurantPayment(
    owner: User,
    { transactionId, restaurantId }: CreateRestaurantPaymentInput,
  ): Promise<CreateRestaurantPaymentOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (restaurant.ownerId !== owner.id) {
        return { ok: false, error: 'You are not allowed to pay' };
      }
      restaurant.isPromoted = true;
      const date = new Date();
      date.setDate(date.getDate() + 7);
      restaurant.promotedUntil = date;
      await this.restaurants.save(restaurant);
      const paddlePayment = await this.paddlePayments.save({
        transactionId,
        restaurant,
      });
      await this.commonPayments.save({
        user: owner,
        paddlePayment,
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not create restaurnt payment' };
    }
  }

  async getRestaurantPayments(
    user: User,
    { page, take }: GetRestaurantPaymentsInput,
  ): Promise<GetRestaurantPaymentsOutput> {
    try {
      const [payments, totalResults] = await this.commonPayments.findAndCount({
        where: { user: { id: user.id } },
        relations: { paddlePayment: true },
        take,
        skip: (page - 1) * take,
      });
      const totalPages = Math.ceil(totalResults / take);
      return { ok: true, payments, totalPages, totalResults };
    } catch (error) {
      console.log(error);
      return { ok: false, error: 'Could not load restaurant payments' };
    }
  }

  @Cron('0 0 0 * * *')
  async checkPromotedRestaurants() {
    const restaurants = await this.restaurants.find({
      where: { isPromoted: true, promotedUntil: LessThan(new Date()) },
    });
    console.log(restaurants);
    for (const restaurant of restaurants) {
      restaurant.isPromoted = false;
      restaurant.promotedUntil = null;
      await this.restaurants.save(restaurant);
    }
  }
}
