import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from 'src/users/entities/user.entity';
import { CategoryRepository } from 'src/restaurants/repositories/category.repository';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Client, createClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';

const GRAPHQL_ENDPOINT = '/graphql';

//mockUser 더미데이터
const testOwner1 = {
  email: 'testOwner1@mail.com',
  password: 'owner1',
  role: UserRole.Owner,
};
const testOwner2 = {
  email: 'testOwner2@mail.com',
  password: 'owner2',
  role: UserRole.Owner,
};
const testClient1 = {
  email: 'testClient1@mail.com',
  password: 'client',
  role: UserRole.Client,
};
const testClient2 = {
  email: 'testClient2@mail.com',
  password: 'client',
  role: UserRole.Client,
};
const testDriver1 = {
  email: 'testDriver1@mail.com',
  password: 'client',
  role: UserRole.Delivery,
};
const testDriver2 = {
  email: 'testDriver2@mail.com',
  password: 'client',
  role: UserRole.Delivery,
};
const testUsers = [
  testOwner1,
  testOwner2,
  testClient1,
  testClient2,
  testDriver1,
  testDriver2,
];

describe('Order Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let restaurantRepository: RestaurantRepository;
  let categoryRepository: CategoryRepository;
  let dishRepository: Repository<Dish>;
  let jwtToken: string;
  let owner1Token: string;
  let owner2Token: string;
  let client1Token: string;
  let client2Token: string;
  let driver1Token: string;
  let driver2Token: string;
  let owner1SubscriptionClient: Client;
  let owner2SubscriptionClient: Client;
  let driver1SubscriptionClient: Client;
  let driver2SubscriptionClient: Client;
  let client1SubscriptionClient: Client;
  let client2SubscriptionClient: Client;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('x-jwt', jwtToken).send({ query });
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    dataSource = module.get(DataSource);
    restaurantRepository = module.get(RestaurantRepository);
    categoryRepository = module.get(CategoryRepository);
    dishRepository = module.get(getRepositoryToken(Dish));
    await app.init();
    //subscription 테스트하기 위해서 3000번 포트에서 실행
    await app.listen(3000);

    //mockUser 생성
    for (const user of testUsers) {
      await publicTest(`
      mutation {
        createAccount(email: "${user.email}", password: "${user.password}", role: ${user.role}) {
          ok
          error
        }
      }
    `);
    }
    //카테고리, 식당, 음식 더미데이터
    const testCategory = {
      name: 'italian food',
      coverImg: 'http://italianfood.jpeg',
      slug: 'italian-food',
    };
    const testRestaurant1 = {
      name: 'test italian food restaurant1',
      coverImg: 'http://test-italian-food.jpeg',
      address: 'Seoul',
      owner: { ...testOwner1, id: 1 },
      category: testCategory,
    };
    const testRestaurant2 = {
      name: 'test italian food restaurant2',
      coverImg: 'http://test-italian-food.jpeg',
      address: 'Seoul',
      owner: { ...testOwner2, id: 2 },
      category: testCategory,
    };
    const testRestaurants = [testRestaurant1, testRestaurant2];
    //mockCategory, mockRestaurant 생성
    await categoryRepository.save(testCategory);
    const [restaurant1Entity, restaurant2Entity] =
      await restaurantRepository.save(testRestaurants);
    //더미 dish
    const testDish1 = {
      name: 'pizza',
      price: 10000,
      description: 'italian pizza',
      restaurant: restaurant1Entity,
      options: [
        {
          name: 'size',
          choices: [
            { name: 'S', extra: 0 },
            { name: 'M', price: 3000 },
            { name: 'L', extra: 5000 },
          ],
          allowMultipleChoices: false,
          required: true,
        },
      ],
    };
    const testDish2 = {
      name: 'pasta',
      price: 8000,
      description: 'italian pasta',
      restaurant: restaurant1Entity,
      options: [
        {
          name: 'noodle',
          choices: [
            { name: 'spaghetti', extra: 0 },
            { name: 'ravioli', price: 1000 },
            { name: 'penne', extra: 1000 },
          ],
          allowMultipleChoices: false,
          required: true,
        },
      ],
    };
    const testDish3 = {
      name: 'pizza',
      price: 10000,
      description: 'italian pizza',
      restaurant: restaurant2Entity,
      options: [
        {
          name: 'size',
          choices: [
            { name: 'S', extra: 0 },
            { name: 'M', price: 3000 },
            { name: 'L', extra: 5000 },
          ],
          allowMultipleChoices: false,
          required: true,
        },
      ],
    };
    const testDish4 = {
      name: 'pasta',
      price: 8000,
      description: 'italian pasta',
      restaurant: restaurant2Entity,
      options: [
        {
          name: 'noodle',
          choices: [
            { name: 'spaghetti', extra: 0 },
            { name: 'ravioli', price: 1000 },
            { name: 'penne', extra: 1000 },
          ],
          allowMultipleChoices: false,
          required: true,
        },
      ],
    };
    const testDishes = [testDish1, testDish2, testDish3, testDish4];
    //mockDish 생성
    await dishRepository.save(testDishes);
    //각 유저 토큰 저장
    const owner1LoginResponse = await publicTest(`
      mutation {
        login(email: "${testOwner1.email}", password: "${testOwner1.password}") {
          ok
          error
          token
        }
      }
    `);
    const owner2LoginResponse = await publicTest(`
      mutation {
        login(email: "${testOwner2.email}", password: "${testOwner2.password}") {
          ok
          error
          token
        }
      }
    `);
    const client1LoginResponse = await publicTest(`
      mutation {
        login(email: "${testClient1.email}", password: "${testClient1.password}") {
          ok
          error
          token
        }
      }
    `);
    const client2LoginResponse = await publicTest(`
      mutation {
        login(email: "${testClient2.email}", password: "${testClient2.password}") {
          ok
          error
          token
        }
      }
    `);
    const driver1LoginResponse = await publicTest(`
      mutation {
        login(email: "${testDriver1.email}", password: "${testDriver1.password}") {
          ok
          error
          token
        }
      }
    `);
    const driver2LoginResponse = await publicTest(`
      mutation {
        login(email: "${testDriver2.email}", password: "${testDriver2.password}") {
          ok
          error
          token
        }
      }
    `);

    owner1Token = owner1LoginResponse.body.data.login.token;
    owner2Token = owner2LoginResponse.body.data.login.token;
    client1Token = client1LoginResponse.body.data.login.token;
    client2Token = client2LoginResponse.body.data.login.token;
    driver1Token = driver1LoginResponse.body.data.login.token;
    driver2Token = driver2LoginResponse.body.data.login.token;
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe('createOrder', () => {
    beforeEach(async () => {
      //subscription client 생성
      owner1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': owner1Token },
        //lazy default값은 true -> 실제방식대로 호출될 때 까지 연결안됨, false -> 즉시 연결
        lazy: false,
      });
      owner2SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': owner2Token },
        lazy: false,
      });
      driver1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': driver1Token },
        lazy: false,
      });
      client1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': client1Token },
        lazy: false,
      });
    });

    it('should fail if user is not client', async () => {
      //owner1으로 로그인
      jwtToken = owner1Token;
      //owner로 주문 생성
      return privateTest(`
        mutation {
          createOrder(
            restaurantId: 1
            items: [
              { dishId: 1, options: [{ name: "size", choices: ["M"] }] }
              {
                dishId: 2
                options: [{ name: "noodle", choices: ["penne"] }]
              }
            ]
          ) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          expect(error.message).toBe('Forbidden resource');
        });
    });

    it('should create order', async () => {
      jwtToken = client1Token;
      await privateTest(`
        mutation {
          createOrder(
            restaurantId: 2
            items: [
              { dishId: 3, options: [{ name: "size", choices: ["S"] }] }
              {
                dishId: 4
                options: [{ name: "noodle", choices: ["penne"] }]
              }
            ]
          ) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should listen web-socket message only when owner is appropriate', async () => {
      const subscriptionQuery = {
        query: `
              subscription {
                pendingOrders {
                  id
                  items {
                    dish {
                      name
                    }
                    options {
                      name
                      choices {
                        name
                      }
                    }
                  }
                }
              }`,
      };

      //구독 생성 이 때부터 이벤트 리스닝 가능
      const owner1Subscription =
        owner1SubscriptionClient.iterate(subscriptionQuery);
      const owner2Subscription =
        owner2SubscriptionClient.iterate(subscriptionQuery);
      const driver1Subscription =
        driver1SubscriptionClient.iterate(subscriptionQuery);
      const client1Subscription =
        client1SubscriptionClient.iterate(subscriptionQuery);

      delay(500);

      //이벤트 발생
      await privateTest(`
        mutation {
          createOrder(
            restaurantId: 1
            items: [
              { dishId: 1, options: [{ name: "size", choices: ["S"] }] }
              {
                dishId: 2
                options: [{ name: "noodle", choices: ["penne"] }]
              }
            ]
          ) {
            ok
            error
          }
        }
        `);

      delay(2000);

      //next()호출로 구독 스트림에서 이벤트 데이터 받아서 처리
      //1초안에 메시지 리스닝 못하면 아예 못하는 것으로 간주
      const owner1Result = await Promise.race([
        owner1Subscription.next(),
        delay(1000),
      ]);
      const owner2Result = await Promise.race([
        owner2Subscription.next(),
        delay(1000),
      ]);
      const driver1Result = await Promise.race([
        driver1Subscription.next(),
        delay(1000),
      ]);
      const client1Result = await Promise.race([
        client1Subscription.next(),
        delay(1000),
      ]);
      expect(owner1Result['value'].data.pendingOrders).toMatchObject({
        id: 2,
        items: [
          {
            dish: { name: 'pizza' },
            options: [{ name: 'size', choices: [{ name: 'S' }] }],
          },
          {
            dish: { name: 'pasta' },
            options: [{ name: 'noodle', choices: [{ name: 'penne' }] }],
          },
        ],
      });
      expect(owner2Result).toBeUndefined();
      expect(driver1Result['value'].errors[0].message).toBe(
        'Forbidden resource',
      );
      expect(client1Result['value'].errors[0].message).toBe(
        'Forbidden resource',
      );
    });

    afterEach(async () => {
      //웹소켓 연결 종료
      await owner1SubscriptionClient.dispose();
      await owner2SubscriptionClient.dispose();
      await driver1SubscriptionClient.dispose();
      await client1SubscriptionClient.dispose();
    });
  });

  describe('editOrder', () => {
    beforeEach(async () => {
      owner1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': owner1Token },
        lazy: false,
      });
      owner2SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': owner2Token },
        lazy: false,
      });
      driver1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': driver1Token },
        lazy: false,
      });
      driver2SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': driver2Token },
        lazy: false,
      });
      client1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': client1Token },
        lazy: false,
      });
      client2SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': client2Token },
        lazy: false,
      });
    });

    it('should fail if client trying to edit order', async () => {
      jwtToken = client1Token;
      await privateTest(`
          mutation {
            editOrder(id: 1, status: Cooking) {
              ok
              error
            }
          }          
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              errors: [{ message }],
            },
          } = res;
          expect(message).toBe('Forbidden resource');
        });
    });

    it('should fail if order is not found', async () => {
      jwtToken = owner1Token;
      await privateTest(`
        mutation {
          editOrder(id: 3, status: Cooking) {
            ok
            error
          }
        }          
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Order not found');
        });
    });

    it('should fail if inappropriate user trying to edit order', async () => {
      jwtToken = owner1Token;
      await privateTest(`
        mutation {
          editOrder(id: 1, status: Cooking) {
            ok
            error
          }
        }          
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("You can't see this order");
        });
    });

    it('should edit order', async () => {
      jwtToken = owner1Token;
      await privateTest(`
        mutation {
          editOrder(id: 2, status: Cooked) {
            ok
            error
          }
        }          
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });

      jwtToken = driver1Token;
      await privateTest(`
          mutation {
            takeOrder(id: 2) {
              ok
              error
            }
          } 
          `);

      await privateTest(`
            mutation {
              editOrder(id: 2, status: PickedUp) {
                ok
                error
              }
            }          
            `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if owner change to inappropriate status', async () => {
      jwtToken = owner1Token;
      await privateTest(`
        mutation {
          editOrder(id: 2, status: Delivered) {
            ok
            error
          }
        }          
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("You can't edit order");
        });
    });

    it('should fail if driver change to  status', async () => {
      jwtToken = driver1Token;
      await privateTest(`
        mutation {
          editOrder(id: 2, status: Pending) {
            ok
            error
          }
        }          
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("You can't edit order");
        });
    });

    it('should listen web-socket message only when user is appropriate', async () => {
      const orderUpdatesQuery = {
        query: `
          subscription {
          orderUpdates(id: 1) {
            status
            restaurant {
              name
            }
            total
            items {
              dish {
                name
              }
            }
            customer {
              email
            }
            driver {
              email
            }
          }
        }`,
      };

      const cookedOrderssQuery = {
        query: `
          subscription {
            cookedOrders {
              restaurant {
                name
              }
              total
              items {
                dish {
                  name
                }
              }
              customer {
                email
              }
            }
          }`,
      };

      const owner1OrderUptaes =
        owner1SubscriptionClient.iterate(orderUpdatesQuery);
      const owner1cookedOrders =
        owner1SubscriptionClient.iterate(cookedOrderssQuery);
      const owner2OrderUpdates =
        owner2SubscriptionClient.iterate(orderUpdatesQuery);
      const owner2cookedOrders =
        owner2SubscriptionClient.iterate(cookedOrderssQuery);
      const driver1OrderUpdates =
        driver1SubscriptionClient.iterate(orderUpdatesQuery);
      const dirver1cookedOrders =
        driver1SubscriptionClient.iterate(cookedOrderssQuery);
      const driver2OrderUpdates =
        driver2SubscriptionClient.iterate(orderUpdatesQuery);
      const dirver2cookedOrders =
        driver2SubscriptionClient.iterate(cookedOrderssQuery);
      const client1OrderUpdates =
        client1SubscriptionClient.iterate(orderUpdatesQuery);
      const client1cookedOrders =
        client1SubscriptionClient.iterate(cookedOrderssQuery);
      const client2OrderUpdates =
        client2SubscriptionClient.iterate(orderUpdatesQuery);
      const client2cookedOrders =
        client2SubscriptionClient.iterate(cookedOrderssQuery);

      delay(500);

      jwtToken = owner2Token;
      await privateTest(`
        mutation {
          editOrder(id: 1, status: Cooked) {
            ok
            error
          }
        }
        `);

      const owner1OrderUpdatesResult = await Promise.race([
        owner1OrderUptaes.next(),
        delay(500),
      ]);
      const owner1cookedOrdersResult = await Promise.race([
        owner1cookedOrders.next(),
        delay(500),
      ]);
      const owner2OrderUpdatesResult = await Promise.race([
        owner2OrderUpdates.next(),
        delay(500),
      ]);
      const owner2cookedOrdersResult = await Promise.race([
        owner2cookedOrders.next(),
        delay(500),
      ]);
      const driver1OrderUpdatesResult = await Promise.race([
        driver1OrderUpdates.next(),
        delay(500),
      ]);
      const driver1cookedOrdersResult = await Promise.race([
        dirver1cookedOrders.next(),
        delay(500),
      ]);
      const driver2OrderUpdatesResult = await Promise.race([
        driver2OrderUpdates.next(),
        delay(500),
      ]);
      const driver2cookedOrdersResult = await Promise.race([
        dirver2cookedOrders.next(),
        delay(500),
      ]);
      const client1OrderUpdatesResult = await Promise.race([
        client1OrderUpdates.next(),
        delay(500),
      ]);
      const client1cookedOrdersResult = await Promise.race([
        client1cookedOrders.next(),
        delay(500),
      ]);
      const client2OrderUpdatesResult = await Promise.race([
        client2OrderUpdates.next(),
        delay(500),
      ]);
      const client2cookedOrdersResult = await Promise.race([
        client2cookedOrders.next(),
        delay(500),
      ]);
      const expectedOrderUptates = {
        status: OrderStatus.Cooked,
        restaurant: { name: 'test italian food restaurant2' },
        total: 19000,
        customer: { email: 'testClient1@mail.com' },
        items: [{ dish: { name: 'pizza' } }, { dish: { name: 'pasta' } }],
      };
      const expectedcookedOrders = {
        restaurant: {
          name: 'test italian food restaurant2',
        },
        total: 19000,
        items: [
          {
            dish: {
              name: 'pizza',
            },
          },
          {
            dish: {
              name: 'pasta',
            },
          },
        ],
        customer: {
          email: 'testClient1@mail.com',
        },
      };

      expect(owner1OrderUpdatesResult).toBeUndefined();
      expect(owner1cookedOrdersResult['value'].errors[0].message).toBe(
        'Forbidden resource',
      );
      expect(owner2OrderUpdatesResult['value'].data.orderUpdates).toMatchObject(
        expectedOrderUptates,
      );
      expect(owner2cookedOrdersResult['value'].errors[0].message).toBe(
        'Forbidden resource',
      );
      expect(driver1OrderUpdatesResult).toBeUndefined();
      expect(
        driver1cookedOrdersResult['value'].data.cookedOrders,
      ).toMatchObject(expectedcookedOrders);
      expect(driver2OrderUpdatesResult).toBeUndefined();
      expect(
        driver2cookedOrdersResult['value'].data.cookedOrders,
      ).toMatchObject(expectedcookedOrders);
      expect(
        client1OrderUpdatesResult['value'].data.orderUpdates,
      ).toMatchObject(expectedOrderUptates);
      expect(client1cookedOrdersResult['value'].errors[0].message).toBe(
        'Forbidden resource',
      );
      expect(client2OrderUpdatesResult).toBeUndefined();
      expect(client2cookedOrdersResult['value'].errors[0].message).toBe(
        'Forbidden resource',
      );
    });

    afterEach(async () => {
      await owner1SubscriptionClient.dispose();
      await owner2SubscriptionClient.dispose();
      await driver1SubscriptionClient.dispose();
      await driver2SubscriptionClient.dispose();
      await client1SubscriptionClient.dispose();
      await client2SubscriptionClient.dispose();
    });
  });

  describe('takeOrder', () => {
    beforeAll(async () => {
      jwtToken = client1Token;
      await privateTest(`
        mutation {
          createOrder(
            restaurantId: 2
            items: [
              { dishId: 3, options: [{ name: "size", choices: ["S"] }] }
              {
                dishId: 4
                options: [{ name: "noodle", choices: ["penne"] }]
              }
            ]
          ) {
            ok
            error
          }
        }
        `);
    });

    beforeEach(async () => {
      owner1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': owner1Token },
        lazy: false,
      });
      owner2SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': owner2Token },
        lazy: false,
      });
      driver1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': driver1Token },
        lazy: false,
      });
      driver2SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': driver2Token },
        lazy: false,
      });
      client1SubscriptionClient = createClient({
        url: `ws://localhost:3000${GRAPHQL_ENDPOINT}`,
        webSocketImpl: WebSocket,
        connectionParams: { 'x-jwt': client1Token },
        lazy: false,
      });
    });

    it('should fail if user is not driver', async () => {
      jwtToken = owner1Token;
      await privateTest(`
        mutation {
          takeOrder(id: 1) {
            ok
            error
          }
        }        
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              errors: [{ message }],
            },
          } = res;
          expect(message).toBe('Forbidden resource');
        });

      jwtToken = client1Token;
      await privateTest(`
          mutation {
            takeOrder(id: 1) {
              ok
              error
            }
          }        
          `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              errors: [{ message }],
            },
          } = res;
          expect(message).toBe('Forbidden resource');
        });
    });

    it('should fail if order is not found', async () => {
      jwtToken = driver1Token;
      await privateTest(`
        mutation {
          takeOrder(id: 4) {
            ok
            error
          }
        }        
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Order not found');
        });
    });

    it('should take order', async () => {
      jwtToken = driver1Token;
      await privateTest(`
        mutation {
          takeOrder(id: 1) {
            ok
            error
          }
        }
       `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if order has another driver', async () => {
      jwtToken = driver2Token;
      await privateTest(`
        mutation {
          takeOrder(id: 1) {
            ok
            error
          }
        }
       `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('This order already has a driver');
        });
    });

    it('should fail if owner has not accepted order', async () => {
      jwtToken = driver2Token;
      await privateTest(`
        mutation {
          takeOrder(id: 3) {
            ok
            error
          }
        }
       `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                takeOrder: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe(
            'Could not be assigned before owner has accepted order',
          );
        });
    });

    it('should listen web-socket message only when user is appropriate', async () => {
      jwtToken = owner2Token;
      await privateTest(`
        mutation {
          editOrder(id: 3, status: Cooked) {
            ok
            error
          }
        }          
        `);

      const orderUpdatesQuery = {
        query: `
            subscription {
            orderUpdates(id: 3) {
              status
              restaurant {
                name
              }
              total
              items {
                dish {
                  name
                }
              }
              customer {
                email
              }
              driver {
                email
              }
            }
          }`,
      };

      const owner1OrderUptaes =
        owner1SubscriptionClient.iterate(orderUpdatesQuery);
      const owner2OrderUpdates =
        owner2SubscriptionClient.iterate(orderUpdatesQuery);
      const driver1OrderUpdates =
        driver1SubscriptionClient.iterate(orderUpdatesQuery);
      const driver2OrderUpdates =
        driver2SubscriptionClient.iterate(orderUpdatesQuery);
      const client1OrderUpdates =
        client1SubscriptionClient.iterate(orderUpdatesQuery);
      const client2OrderUpdates =
        client2SubscriptionClient.iterate(orderUpdatesQuery);

      delay(500);

      jwtToken = driver1Token;
      await privateTest(`
          mutation {
            takeOrder(id: 3) {
              ok
              error
            }
          }
          `);

      const owner1OrderUpdatesResult = await Promise.race([
        owner1OrderUptaes.next(),
        delay(500),
      ]);
      const owner2OrderUpdatesResult = await Promise.race([
        owner2OrderUpdates.next(),
        delay(500),
      ]);
      const driver1OrderUpdatesResult = await Promise.race([
        driver1OrderUpdates.next(),
        delay(500),
      ]);
      const driver2OrderUpdatesResult = await Promise.race([
        driver2OrderUpdates.next(),
        delay(500),
      ]);
      const client1OrderUpdatesResult = await Promise.race([
        client1OrderUpdates.next(),
        delay(500),
      ]);
      const client2OrderUpdatesResult = await Promise.race([
        client2OrderUpdates.next(),
        delay(500),
      ]);
      const expectedOrderUptates = {
        status: OrderStatus.Cooked,
        restaurant: { name: 'test italian food restaurant2' },
        total: 19000,
        customer: { email: 'testClient1@mail.com' },
        items: [{ dish: { name: 'pizza' } }, { dish: { name: 'pasta' } }],
      };

      expect(owner1OrderUpdatesResult).toBeUndefined();
      expect(owner2OrderUpdatesResult['value'].data.orderUpdates).toMatchObject(
        expectedOrderUptates,
      );
      expect(
        driver1OrderUpdatesResult['value'].data.orderUpdates,
      ).toMatchObject(expectedOrderUptates);
      expect(driver2OrderUpdatesResult).toBeUndefined();
      expect(
        client1OrderUpdatesResult['value'].data.orderUpdates,
      ).toMatchObject(expectedOrderUptates);
      expect(client2OrderUpdatesResult).toBeUndefined();
    });

    afterEach(async () => {
      await owner1SubscriptionClient.dispose();
      await owner2SubscriptionClient.dispose();
      await driver1SubscriptionClient.dispose();
      await driver2SubscriptionClient.dispose();
      await client1SubscriptionClient.dispose();
    });
  });

  describe('getOrders', () => {
    it('should get orders for client user', async () => {
      jwtToken = client1Token;
      await privateTest(`
        query {
          getOrders {
            ok
            error
            orders {
              id
              status
            }
            totalPages
            totalResults
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getOrders: { ok, error, orders, totalPages, totalResults },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(orders).toHaveLength(3);
          expect(totalPages).toBe(1);
          expect(totalResults).toBe(3);
        });
    });

    it('should get orders for driver user', async () => {
      jwtToken = driver1Token;
      await privateTest(`
        query {
          getOrders {
            ok
            error
            orders {
              id
              status
            }
            totalPages
            totalResults
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getOrders: { ok, error, orders, totalPages, totalResults },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(orders).toHaveLength(3);
          expect(totalPages).toBe(1);
          expect(totalResults).toBe(3);
        });
    });

    it('should get orders for owner user', async () => {
      jwtToken = owner1Token;
      await privateTest(`
        query {
          getOrders {
            ok
            error
            orders {
              id
              status
            }
            totalPages
            totalResults
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getOrders: { ok, error, orders, totalPages, totalResults },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(orders).toHaveLength(1);
          expect(totalPages).toBe(1);
          expect(totalResults).toBe(1);
        });
    });
  });

  describe('getOrder', () => {
    it('should fail if order is not found', async () => {
      jwtToken = client1Token;
      await privateTest(`
        query {
          getOrder(id: 4) {
            ok
            error
            order {
              id
            }
          }
        }        
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getOrder: { ok, error, order },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Order not found');
          expect(order).toBe(null);
        });
    });

    it("should fail if user trying to get other's order", async () => {
      jwtToken = client2Token;
      await privateTest(`
        query {
          getOrder(id: 3) {
            ok
            error
            order {
              id
            }
          }
        }        
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getOrder: { ok, error, order },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("You can't see this order");
          expect(order).toBe(null);
        });
    });

    it('should get an order', async () => {
      jwtToken = client1Token;
      await privateTest(`
        query {
          getOrder(id: 3) {
            ok
            error
            order {
              id
            }
          }
        }        
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                getOrder: { ok, error, order },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(order).toMatchObject({ id: 3 });
        });
    });
  });
});
