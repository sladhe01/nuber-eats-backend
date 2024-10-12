import { Repository } from 'typeorm';
import { OrderService } from './orders.service';
import { Order } from './entities/order.entity';
import { Test } from '@nestjs/testing';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Dish } from 'src/restaurants/entities/dish.entity';

jest.mock('src/restaurants/repositories/restaurant.repository');

const mockRepository = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
});

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: MockRepository<Order>;
  let orderItemRepository: MockRepository<OrderItem>;
  let restaurantRepository: jest.Mocked<RestaurantRepository>;
  let dishRepository: MockRepository<Dish>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        RestaurantRepository,
        { provide: getRepositoryToken(Order), useValue: mockRepository() },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepository() },
        { provide: getRepositoryToken(Dish), useValue: mockRepository() },
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.todo('createOrder');
  it.todo('getOrders');
  it.todo('getOrder');
  it.todo('editOrder');
});
