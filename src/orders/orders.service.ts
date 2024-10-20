import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { OrderItem, OrderItemOption } from './entities/order-item.entity';
import { Dish, DishChoice } from 'src/restaurants/entities/dish.entity';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { PubSub } from 'graphql-subscriptions';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Dish) private readonly dishes: Repository<Dish>,
    private readonly restaurants: RestaurantRepository,
    @Inject(PUB_SUB) private readonly pubsub: PubSub,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items, destination }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      let orderFinalPrice = 0;
      let orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOne({ where: { id: item.dishId } });
        if (!dish) {
          return { ok: false, error: 'Dish not found' };
        }
        orderFinalPrice += dish.price;
        let orderItemOptions: OrderItemOption[] | undefined;
        if (item.options) {
          orderItemOptions = [];
          for (const itemOption of item.options) {
            const dishOption = dish.options.find(
              (dishOption) => dishOption.name === itemOption.name,
            );
            if (!dishOption) {
              return { ok: false, error: 'Not found option' };
            }
            let orderItemOptionChoices: DishChoice[] = [];
            for (const itemOptionChoice of itemOption.choices) {
              const dishOptionChoice = dishOption.choices.find(
                (dishOptionChoice) =>
                  dishOptionChoice.name === itemOptionChoice,
              );
              if (!dishOptionChoice) {
                return { ok: false, error: 'Not found choice' };
              }
              orderItemOptionChoices.push({
                name: dishOptionChoice.name,
                extra: dishOptionChoice.extra,
              });
              orderFinalPrice += dishOptionChoice.extra;
            }
            orderItemOptions.push({
              name: dishOption.name,
              choices: orderItemOptionChoices,
            });
          }
        }
        const orderItem = await this.orderItems.save(
          this.orderItems.create({ dish, options: orderItemOptions }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
          destination,
        }),
      );
      await this.pubsub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not create order' };
    }
  }

  async getOrders(
    user: User,
    { status, page, take }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[], totalPages: number, totalResults: number;

      if (user.role === UserRole.Client) {
        [orders, totalResults] = await this.orders.findAndCount({
          where: { customer: { id: user.id }, ...(status && { status }) },
          take,
          skip: (page - 1) * take,
        });
      } else if (user.role === UserRole.Delivery) {
        [orders, totalResults] = await this.orders.findAndCount({
          where: { driver: { id: user.id }, ...(status && { status }) },
          take,
          skip: (page - 1) * take,
        });
      } else if (user.role === UserRole.Owner) {
        [orders, totalResults] = await this.orders.findAndCount({
          where: {
            restaurant: { owner: { id: user.id } },
            ...(status && { status }),
          },
          take,
          skip: (page - 1) * take,
        });
      }
      totalPages = Math.ceil(totalResults / take);
      return { ok: true, orders, totalPages, totalResults };
    } catch (error) {
      return { ok: false, error: 'Could not get orders' };
    }
  }

  allowedSeeOrder(user: User, order: Order): boolean {
    let allowed = true;
    switch (user.role) {
      case UserRole.Client:
        if (order.customerId !== user.id) allowed = false;
        break;
      case UserRole.Delivery:
        if (order.driverId !== user.id) allowed = false;
        break;
      case UserRole.Owner:
        if (order.restaurant.ownerId !== user.id) allowed = false;
        break;
    }
    return allowed;
  }

  async getOrder(user: User, { id }: GetOrderInput): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id },
        relations: { restaurant: true },
      });
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (!this.allowedSeeOrder(user, order)) {
        return { ok: false, error: "You can't see this order" };
      }
      return { ok: true, order };
    } catch (error) {
      return { ok: false, error: 'Could not get order' };
    }
  }

  async editOrder(
    user: User,
    { id, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne({
        where: { id },
      });
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (!this.allowedSeeOrder(user, order)) {
        return { ok: false, error: "You can't see this order" };
      }
      let canEdit = true;
      switch (user.role) {
        case UserRole.Owner:
          if (
            ![
              OrderStatus.Canceled,
              OrderStatus.Cooked,
              OrderStatus.Cooking,
              OrderStatus.Pending,
            ].includes(status)
          )
            canEdit = false;
          break;
        case UserRole.Delivery:
          if (
            !(
              (order.status === OrderStatus.Cooked &&
                status === OrderStatus.PickedUp) ||
              (order.status === OrderStatus.PickedUp &&
                status === OrderStatus.Delivered)
            )
          )
            canEdit = false;
          break;
        case UserRole.Client:
          canEdit = false;
      }
      if (!canEdit) {
        return { ok: false, error: "You can't edit order" };
      }
      const updatedOrder = { ...order, status };
      await this.orders.save({ id, status });
      if (user.role === UserRole.Owner) {
        if (status === OrderStatus.Cooked) {
          await this.pubsub.publish(NEW_COOKED_ORDER, {
            cookedOrders: updatedOrder,
          });
        }
      }
      await this.pubsub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: updatedOrder,
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not edit order' };
    }
  }

  async takeOrder(
    driver: User,
    { id }: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    try {
      const order = await this.orders.findOne({ where: { id } });
      if (!order) {
        return { ok: false, error: 'Order not found' };
      }
      if (order.driver) {
        return { ok: false, error: 'This order already has a driver' };
      }
      if (![OrderStatus.Cooked, OrderStatus.Cooking].includes(order.status)) {
        return {
          ok: false,
          error: 'Could not be assigned before owner has accepted order',
        };
      }
      await this.orders.save({ id, driver });
      await this.pubsub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: { ...order, driver, driverId: driver.id },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not take order' };
    }
  }
}
