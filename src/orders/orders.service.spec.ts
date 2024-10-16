import { Repository } from 'typeorm';
import { OrderService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { Test } from '@nestjs/testing';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Dish, DishOption } from 'src/restaurants/entities/dish.entity';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { PubSub } from 'graphql-subscriptions';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

jest.mock('src/restaurants/repositories/restaurant.repository');
jest.mock('graphql-subscriptions');

const mockRepository = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  softDelete: jest.fn(),
});

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: MockRepository<Order>;
  let orderItemRepository: MockRepository<OrderItem>;
  let restaurantRepository: jest.Mocked<RestaurantRepository>;
  let dishRepository: MockRepository<Dish>;
  let pubsub: PubSub;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        RestaurantRepository,
        { provide: getRepositoryToken(Order), useValue: mockRepository() },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepository() },
        { provide: getRepositoryToken(Dish), useValue: mockRepository() },
        { provide: PUB_SUB, useValue: new PubSub() },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get<MockRepository<Order>>(
      getRepositoryToken(Order),
    );
    orderItemRepository = module.get<MockRepository<OrderItem>>(
      getRepositoryToken(OrderItem),
    );
    restaurantRepository =
      module.get<jest.Mocked<RestaurantRepository>>(RestaurantRepository);
    dishRepository = module.get<MockRepository<Dish>>(getRepositoryToken(Dish));
    pubsub = module.get<PubSub>(PUB_SUB);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const mockCustomer = { id: 1, email: 'test@client.com' } as User;
    const mockRestaurant = { id: 1, name: 'valid restaurant' } as Restaurant;
    const mockDishes = [
      {
        id: 1,
        name: 'pizza',
        price: 10000,
        restaunrantId: 1,
        options: [
          {
            name: 'size',
            choices: [
              { name: 'S', extra: 0 },
              { name: 'M', extra: 1500 },
              { name: 'L', extra: 3000 },
            ],
          },
        ],
      },
      {
        id: 2,
        name: 'pasta',
        price: 8000,
        restaurantId: 1,
        options: [
          {
            name: 'flavor',
            choices: [
              { name: 'hot', extra: 1000 },
              { name: 'mild', extra: 0 },
            ],
          },
        ],
      },
    ];
    const mockItemsWithValidOptions = [
      { dishId: 1, options: [{ name: 'size', choices: ['S'] }] },
      { dishId: 2, options: [{ name: 'flavor', choices: ['hot'] }] },
    ];

    it('should fail if restaurant is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);

      const result = await service.createOrder(mockCustomer, {
        restaurantId: mockRestaurant.id,
        items: mockItemsWithValidOptions,
      });

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRestaurant.id },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if dish is not fouund', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant);
      dishRepository.findOne
        .mockResolvedValueOnce(mockDishes[0])
        .mockResolvedValueOnce(null);

      const result = await service.createOrder(mockCustomer, {
        restaurantId: mockRestaurant.id,
        items: mockItemsWithValidOptions,
      });

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRestaurant.id },
      });
      expect(dishRepository.findOne).toHaveBeenCalledTimes(2);
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: mockDishes[0].id },
      });
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: mockDishes[1].id },
      });
      expect(result).toMatchObject({ ok: false, error: 'Dish not found' });
    });

    it('should fail if dish option is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant);
      dishRepository.findOne
        .mockResolvedValueOnce(mockDishes[0])
        .mockResolvedValueOnce(mockDishes[1]);

      const mockItemsWithUnvalidOptions = [
        { dishId: 1, options: [{ name: 'size', choices: ['S'] }] },
        { dishId: 2, options: [{ name: 'size', choices: ['M'] }] },
      ];

      const result = await service.createOrder(mockCustomer, {
        restaurantId: 1,
        items: mockItemsWithUnvalidOptions,
      });

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRestaurant.id },
      });
      expect(dishRepository.findOne).toHaveBeenCalledTimes(2);
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: mockDishes[0].id },
      });
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: mockDishes[1].id },
      });
      expect(result).toMatchObject({ ok: false, error: 'Not found option' });
    });

    it("should fail if dish option's choice is not found", async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant);
      dishRepository.findOne
        .mockResolvedValueOnce(mockDishes[0])
        .mockResolvedValueOnce(mockDishes[1]);

      const mockItemsWithUnvalidChoices = [
        { dishId: 1, options: [{ name: 'size', choices: ['S'] }] },
        { dishId: 2, options: [{ name: 'flavor', choices: ['sweet'] }] },
      ];

      const result = await service.createOrder(mockCustomer, {
        restaurantId: 1,
        items: mockItemsWithUnvalidChoices,
      });

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRestaurant.id },
      });
      expect(dishRepository.findOne).toHaveBeenCalledTimes(2);
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: mockDishes[0].id },
      });
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: mockDishes[1].id },
      });
      expect(result).toMatchObject({ ok: false, error: 'Not found choice' });
    });

    it('should create order', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant);
      dishRepository.findOne
        .mockResolvedValueOnce(mockDishes[0])
        .mockResolvedValueOnce(mockDishes[1]);
      orderItemRepository.create.mockResolvedValue(expect.any(Object));
      orderItemRepository.save.mockResolvedValue(expect.any(Object));
      orderRepository.create.mockResolvedValue(expect.any(Object));
      orderRepository.save.mockResolvedValue(expect.any(Object));

      const result = await service.createOrder(mockCustomer, {
        restaurantId: 1,
        items: mockItemsWithValidOptions,
      });

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRestaurant.id },
      });
      expect(dishRepository.findOne).toHaveBeenCalledTimes(2);
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: mockDishes[0].id },
      });
      expect(dishRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: mockDishes[1].id },
      });
      expect(orderItemRepository.save).toHaveBeenCalledTimes(2);
      expect(orderItemRepository.save).toHaveBeenCalledWith(expect.any(Object));
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith(expect.any(Object));
      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(
        NEW_PENDING_ORDER,
        expect.any(Object),
      );
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());

      const result = await service.createOrder(mockCustomer, {
        restaurantId: mockRestaurant.id,
        items: mockItemsWithValidOptions,
      });

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ok: false,
        error: 'Could not create order',
      });
    });
  });

  describe('getOrders', () => {
    const getOrdersArgs = { page: 1, take: 10, status: OrderStatus.Delivered };

    it("it should get client's orders", async () => {
      const mockClient = { id: 1, role: UserRole.Client } as User;
      orderRepository.findAndCount.mockResolvedValue([
        expect.any(Object),
        expect.any(Number),
      ]);

      const result = await service.getOrders(mockClient, getOrdersArgs);

      expect(orderRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          customerId: mockClient.id,
          ...(getOrdersArgs.status && { status: getOrdersArgs.status }),
        },
        take: getOrdersArgs.take,
        skip: (getOrdersArgs.page - 1) * getOrdersArgs.take,
      });
      expect(result).toMatchObject({
        ok: true,
        orders: expect.any(Object),
        totalPages: expect.any(Number),
        totalResults: expect.any(Number),
      });
    });

    it("it should get driver's orders", async () => {
      const mockDriver = { id: 1, role: UserRole.Delivery } as User;
      orderRepository.findAndCount.mockResolvedValue([
        expect.any(Object),
        expect.any(Number),
      ]);

      const result = await service.getOrders(mockDriver, getOrdersArgs);

      expect(orderRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          driverId: mockDriver.id,
          ...(getOrdersArgs.status && { status: getOrdersArgs.status }),
        },
        take: getOrdersArgs.take,
        skip: (getOrdersArgs.page - 1) * getOrdersArgs.take,
      });
      expect(result).toMatchObject({
        ok: true,
        orders: expect.any(Object),
        totalPages: expect.any(Number),
        totalResults: expect.any(Number),
      });
    });

    it("it should get owner's orders", async () => {
      const mockOwner = { id: 1, role: UserRole.Owner } as User;
      orderRepository.findAndCount.mockResolvedValue([
        expect.any(Object),
        expect.any(Number),
      ]);

      const result = await service.getOrders(mockOwner, getOrdersArgs);

      expect(orderRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          restaurant: { ownerId: mockOwner.id },
          ...(getOrdersArgs.status && { status: getOrdersArgs.status }),
        },
        take: getOrdersArgs.take,
        skip: (getOrdersArgs.page - 1) * getOrdersArgs.take,
      });
      expect(result).toMatchObject({
        ok: true,
        orders: expect.any(Object),
        totalPages: expect.any(Number),
        totalResults: expect.any(Number),
      });
    });

    it('should fail on exception', async () => {
      const mockClient = { id: 1, role: UserRole.Client } as User;
      orderRepository.findAndCount.mockRejectedValue(new Error());

      const result = await service.getOrders(mockClient, getOrdersArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not get orders',
      });
    });
  });

  describe('allowedSeeOrder', () => {
    it('should return true to matching client', async () => {
      const mockClient = { id: 1, role: UserRole.Client } as User;
      const mockOrder = { customerId: 1 } as Order;

      const result = service.allowedSeeOrder(mockClient, mockOrder);

      expect(result).toBe(true);
    });

    it('should return false to not matching client', async () => {
      const mockClient = { id: 1, role: UserRole.Client } as User;
      const mockOrder = { customerId: 2 } as Order;

      const result = service.allowedSeeOrder(mockClient, mockOrder);

      expect(result).toBe(false);
    });

    it('should return true to matching driver', async () => {
      const mockDriver = { id: 1, role: UserRole.Delivery } as User;
      const mockOrder = { driverId: 1 } as Order;

      const result = service.allowedSeeOrder(mockDriver, mockOrder);

      expect(result).toBe(true);
    });

    it('should return false to not matching driver', async () => {
      const mockDriver = { id: 1, role: UserRole.Delivery } as User;
      const mockOrder = { driverId: 2 } as Order;

      const result = service.allowedSeeOrder(mockDriver, mockOrder);

      expect(result).toBe(false);
    });

    it('should return true to matching owner', async () => {
      const mockOwner = { id: 1, role: UserRole.Owner } as User;
      const mockOrder = { restaurant: { ownerId: 1 } } as Order;

      const result = service.allowedSeeOrder(mockOwner, mockOrder);

      expect(result).toBe(true);
    });

    it('should return false to not matching owner', async () => {
      const mockOwner = { id: 1, role: UserRole.Owner } as User;
      const mockOrder = { restaurant: { ownerId: 2 } } as Order;

      const result = service.allowedSeeOrder(mockOwner, mockOrder);

      expect(result).toBe(false);
    });
  });

  describe('getOrder', () => {
    const mockUser = { id: 1, role: UserRole.Client } as User;

    it('should fail if order is not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      const result = await service.getOrder(mockUser, { id: 1 });

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { restaurant: true },
      });
      expect(result).toMatchObject({ ok: false, error: 'Order not found' });
    });

    it('should fail if user is not allowed', async () => {
      const mockOrder = { id: 1, customerId: 2 } as Order;
      jest.spyOn(service, 'allowedSeeOrder');
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrder(mockUser, { id: 1 });

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { restaurant: true },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ok: false,
        error: "You can't see this order",
      });
    });

    it('should get order', async () => {
      const mockOrder = { id: 1, customerId: 1 } as Order;
      jest.spyOn(service, 'allowedSeeOrder');
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrder(mockUser, { id: 1 });

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { restaurant: true },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(result).toMatchObject({
        ok: true,
      });
    });

    it('should fail on execption', async () => {
      orderRepository.findOne.mockRejectedValue(new Error());

      const result = await service.getOrder(mockUser, { id: 1 });

      expect(result).toMatchObject({ ok: false, error: 'Could not get order' });
    });
  });

  describe('editOrder', () => {
    it('should fail if order is not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);
      const mockUser = { id: 1 } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Pending };

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(result).toMatchObject({ ok: false, error: 'Order not found' });
    });

    it('should fail if user is not allowed', async () => {
      const mockUser = { id: 1, role: UserRole.Delivery } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Pending };
      const mockOrder = { id: 1, driverId: 2 } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(result).toMatchObject({
        ok: false,
        error: "You can't see this order",
      });
    });

    it('should fail if owner trying to edit with unvalid status', async () => {
      const mockUser = { id: 1, role: UserRole.Owner } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.PickedUp };
      const mockOrder = {
        id: 1,
        driverId: 2,
        restaurant: { ownerId: 1 },
        status: OrderStatus.Cooked,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(result).toMatchObject({
        ok: false,
        error: "You can't edit order",
      });
    });

    it('should fail if driver trying to edit with unvalid status', async () => {
      const mockUser = { id: 1, role: UserRole.Delivery } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Pending };
      const mockOrder = {
        id: 1,
        driverId: 1,
        status: OrderStatus.Cooked,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(result).toMatchObject({
        ok: false,
        error: "You can't edit order",
      });
    });

    it('should fail if client trying to edit order', async () => {
      const mockUser = { id: 1, role: UserRole.Client } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Pending };
      const mockOrder = {
        id: 1,
        customerId: 1,
        status: OrderStatus.Cooked,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(result).toMatchObject({
        ok: false,
        error: "You can't edit order",
      });
    });

    it('should edit order when owner change status to cooked', async () => {
      const mockUser = { id: 1, role: UserRole.Owner } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Cooked };
      const mockOrder = {
        id: 1,
        restaurant: { ownerId: 1 },
        status: OrderStatus.Cooking,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: editOrderArgs.status,
      });

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith(editOrderArgs);
      expect(pubsub.publish).toHaveBeenCalledTimes(2);
      expect(pubsub.publish).toHaveBeenNthCalledWith(1, NEW_COOKED_ORDER, {
        cookedOrders: { ...mockOrder, status: editOrderArgs.status },
      });
      expect(pubsub.publish).toHaveBeenNthCalledWith(2, NEW_ORDER_UPDATE, {
        orderUpdates: { ...mockOrder, status: editOrderArgs.status },
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should edit order when status changed to except cooked state', async () => {
      const mockUser = { id: 1, role: UserRole.Owner } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Cooking };
      const mockOrder = {
        id: 1,
        restaurant: { ownerId: 1 },
        status: OrderStatus.Pending,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: editOrderArgs.status,
      });

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith(editOrderArgs);
      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
        orderUpdates: { ...mockOrder, status: editOrderArgs.status },
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should edit order as driver change status cooked to pickedup', async () => {
      const mockUser = { id: 1, role: UserRole.Delivery } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.PickedUp };
      const mockOrder = {
        id: 1,
        driverId: 1,
        status: OrderStatus.Cooked,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: editOrderArgs.status,
      });

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith(editOrderArgs);
      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
        orderUpdates: { ...mockOrder, status: editOrderArgs.status },
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should edit order as driver change status pickedup to delivered', async () => {
      const mockUser = { id: 1, role: UserRole.Delivery } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Delivered };
      const mockOrder = {
        id: 1,
        driverId: 1,
        status: OrderStatus.PickedUp,
      } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'allowedSeeOrder');
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: editOrderArgs.status,
      });

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: editOrderArgs.id },
      });
      expect(service.allowedSeeOrder).toHaveBeenCalledTimes(1);
      expect(service.allowedSeeOrder).toHaveBeenCalledWith(mockUser, mockOrder);
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith(editOrderArgs);
      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
        orderUpdates: { ...mockOrder, status: editOrderArgs.status },
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      orderRepository.findOne.mockRejectedValue(new Error());
      const mockUser = { id: 1 } as User;
      const editOrderArgs = { id: 1, status: OrderStatus.Pending };

      const result = await service.editOrder(mockUser, editOrderArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not edit order',
      });
    });
  });

  describe('takeOrder', () => {
    const mockDriver = { id: 1 } as User;

    it('should fail if order is not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);
      const takeOrderArgs = { id: 1 };

      const result = await service.takeOrder(mockDriver, takeOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: takeOrderArgs.id },
      });
      expect(result).toMatchObject({ ok: false, error: 'Order not found' });
    });

    it('should fail if order has aleady assigned', async () => {
      const takeOrderArgs = { id: 1 };
      const mockOrder = { driver: { id: 2 } } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.takeOrder(mockDriver, takeOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: takeOrderArgs.id },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'This order already has a driver',
      });
    });

    it('should fail if food is not ready', async () => {
      const takeOrderArgs = { id: 1 };
      const mockOrder = { status: OrderStatus.Pending } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.takeOrder(mockDriver, takeOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: takeOrderArgs.id },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Could not be assigned before food has been ready',
      });
    });

    it('should take order', async () => {
      const takeOrderArgs = { id: 1 };
      const mockOrder = { status: OrderStatus.Cooked } as Order;
      orderRepository.findOne.mockResolvedValue(mockOrder);
      orderRepository.save.mockResolvedValue(expect.any(Object));

      const result = await service.takeOrder(mockDriver, takeOrderArgs);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: takeOrderArgs.id },
      });
      expect(orderRepository.save).toHaveBeenCalledTimes(1);
      expect(orderRepository.save).toHaveBeenCalledWith({
        id: takeOrderArgs.id,
        driver: mockDriver,
      });
      expect(pubsub.publish).toHaveBeenCalledTimes(1);
      expect(pubsub.publish).toHaveBeenCalledWith(NEW_ORDER_UPDATE, {
        orderUpdates: { ...mockOrder, driver: mockDriver },
      });
      expect(result).toMatchObject({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      orderRepository.findOne.mockRejectedValue(new Error());
      const takeOrderArgs = { id: 1 };

      const result = await service.takeOrder(mockDriver, takeOrderArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not take order',
      });
    });
  });
});
