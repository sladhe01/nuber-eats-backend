import { Injectable } from '@nestjs/common';
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

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Dish) private readonly dishes: Repository<Dish>,
    private readonly restaurants: RestaurantRepository,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
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
      await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
        }),
      );
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
          where: { driver: user, ...(status && { status }) },
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
        relations: { restaurant: true },
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
      }
      if (!canEdit) {
        return { ok: false, error: "You can't edit order" };
      }
      await this.orders.save({ id, status });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not edit order' };
    }
  }
}
