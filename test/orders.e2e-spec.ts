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
    const testRestaurant = {
      name: 'test italian food restaurant',
      coverImg: 'http://test-italian-food.jpeg',
      address: 'Seoul',
      owner: { ...testOwner1, id: 1 },
      category: testCategory,
    };
    //mockCategory, mockRestaurant 생성
    await categoryRepository.save(testCategory);
    const restaurantEntity = await restaurantRepository.save(testRestaurant);
    //더미 dish
    const testDish1 = {
      name: 'pizza',
      price: 10000,
      description: 'italian pizza',
      restaurant: restaurantEntity,
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
      restaurant: restaurantEntity,
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
    const testDishes = [testDish1, testDish2];
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

    it('should only valid owner listen web-socket message', async () => {
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

  it.todo('getOrders');
  it.todo('getOrder');
  it.todo('editOrder');
});
