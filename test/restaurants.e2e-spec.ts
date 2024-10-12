import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { CategoryRepository } from 'src/restaurants/repositories/category.repository';
import { UserRole } from 'src/users/entities/user.entity';

const GRAPHQL_ENDPOINT = '/graphql';
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
const testClient = {
  email: 'testClient@mail.com',
  password: 'client',
  role: UserRole.Client,
};
const testUsers = [testOwner1, testOwner2, testClient];

describe('RestaurantModule (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let restaurantRepository: RestaurantRepository;
  let categoryRepository: CategoryRepository;
  let jwtToken: string;
  let clientToken: string;
  let owner1Token: string;
  let owner2Token: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('x-jwt', jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    dataSource = module.get(DataSource);
    restaurantRepository = module.get(RestaurantRepository);
    categoryRepository = module.get(CategoryRepository);
    await app.init();
    //토큰과 hashpassword 때문에 유저는 graphQL 요청으로 직접 생성
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
    //카테고리, 식당 더미데이터 생성
    const categories = [
      {
        name: 'korean food',
        coverImg: 'http://koreanfood.jpeg',
        slug: 'korean-food',
      },
      { name: 'sea food', coverImg: 'http://seafood.jepg', slug: 'sea-food' },
    ];
    await categoryRepository.save(categories);
    for (let i = 1; i <= 15; i++) {
      const koreanFoodRestaurant = {
        name: `test korean food restaurant${i}`,
        coverImg: `http://test-korean-food${i}.jpeg`,
        address: 'Seoul',
        owner: { ...testOwner1, id: 1 },
        category: categories[0],
      };
      await restaurantRepository.save(koreanFoodRestaurant);
    }
    for (let i = 1; i <= 15; i++) {
      const seaFoodRestaurant = {
        name: `test sea food restaurant${i}`,
        coverImg: `http://test-sea-food${i}.jpeg`,
        address: 'Busan',
        owner: { ...testOwner2, id: 2 },
        category: categories[1],
      };
      await restaurantRepository.save(seaFoodRestaurant);
    }
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe('createRestaurant', () => {
    it('should fail if client try creating restaurant', async () => {
      //client로 로그인
      const loginResponse = await publicTest(`
        mutation {
          login(email: "${testClient.email}", password: "${testClient.password}") {
            ok
            error
            token
          }
        }
      `);
      clientToken = loginResponse.body.data.login.token;
      jwtToken = clientToken;
      //client로 레스토랑 생성
      return privateTest(`
        mutation {
          createRestaurant(
            name: "test restaurant1"
            address: "Sejong"
            coverImg: "http://test1.jpeg"
            categoryName: "KOREAN food"
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

    it('should create restaurant', async () => {
      //owner1 게정으로 로그인
      const loginResponse = await publicTest(`
        mutation {
          login(email: "${testOwner1.email}", password: "${testOwner1.password}") {
            ok
            error
            token
          }
        }
      `);
      owner1Token = loginResponse.body.data.login.token;
      jwtToken = owner1Token;
      //restaurant 생성
      return privateTest(`
        mutation {
          createRestaurant(
            name: "test restaurant1"
            address: "Sejong"
            coverImg: "http://test1.jpeg"
            categoryName: "KOREAN food"
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
              data: { createRestaurant },
            },
          } = res;
          expect(createRestaurant.ok).toBe(true);
          expect(createRestaurant.error).toBe(null);
        });
    });

    it('should fail if category is not found', async () => {
      return privateTest(`
        mutation {
          createRestaurant(
            name: "test restaurant1"
            address: "Sejong"
            coverImg: "http://test1.jpeg"
            categoryName: "Chicken"
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
              data: { createRestaurant },
            },
          } = res;
          expect(createRestaurant.ok).toBe(false);
          expect(createRestaurant.error).toBe('Not found category');
        });
    });
  });

  describe('editRestaurant', () => {
    it("should fail if accessed user is not restaurant's owner", async () => {
      //owner2로 로그인
      const loginResponse = await publicTest(`
        mutation {
          login(email: "${testOwner2.email}", password: "${testOwner2.password}") {
            ok
            error
            token
          }
        }
      `);
      owner2Token = loginResponse.body.data.login.token;
      jwtToken = owner2Token;
      //owner2로 owner1의 레스토랑 수정
      return privateTest(`
        mutation {
          editRestaurant(
            restaurantId: 1,
            name: "edited restaurant",
            coverImg:"http://edited.jpeg",
            address:"Suwon",
            categoryName:"Sea Food" ) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { editRestaurant },
            },
          } = res;
          expect(editRestaurant.ok).toBe(false);
          expect(editRestaurant.error).toBe(
            "You can't edit a restaurant that you don't own",
          );
        });
    });

    it('should edit restaurant', async () => {
      //owner1으로 로그인
      jwtToken = owner1Token;
      //restaurant 수정
      return privateTest(`
        mutation {
          editRestaurant(
            restaurantId: 1,
            name: "edited restaurant",
            coverImg:"http://edited.jpeg",
            address:"Suwon",
            categoryName:"Sea Food" ) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { editRestaurant },
            },
          } = res;
          expect(editRestaurant.ok).toBe(true);
          expect(editRestaurant.error).toBe(null);
        });
    });

    it('should fail if category is not found', async () => {
      return privateTest(`
        mutation {
          editRestaurant(
            restaurantId: 1,
            name: "chicken restaurant",
            coverImg:"http://chicken.jpeg",
            address:"Jeju",
            categoryName:"Chicken" ) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { editRestaurant },
            },
          } = res;
          expect(editRestaurant.ok).toBe(false);
          expect(editRestaurant.error).toBe('Not found category');
        });
    });
  });

  describe('deleteRestaurant', () => {
    it("should fail if accessed user is not restaurant's owner", async () => {
      //owner2로 로그인
      jwtToken = owner2Token;
      //restaurant 삭제 실패
      return privateTest(`
        mutation {
          deleteRestaurant(
            restaurantId: 31 ) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { deleteRestaurant },
            },
          } = res;
          expect(deleteRestaurant.ok).toBe(false);
          expect(deleteRestaurant.error).toBe(
            "You can't delete a restaurant that you don't own",
          );
        });
    });

    it('should delte restaurant', async () => {
      //owner1로 로그인
      jwtToken = owner1Token;
      //restaurant 삭제
      return privateTest(`
        mutation {
          deleteRestaurant(
            restaurantId: 31 ) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { deleteRestaurant },
            },
          } = res;
          expect(deleteRestaurant.ok).toBe(true);
          expect(deleteRestaurant.error).toBe(null);
        });
    });
  });

  describe('allCategories', () => {
    it('should load all categories', async () => {
      return publicTest(`
        query {
          allCategories {
            ok
            categories {
              id
              name
              slug
              restaurantCount
            }
            error
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { allCategories },
            },
          } = res;
          expect(allCategories.ok).toBe(true);
          expect(allCategories.categories[0].restaurantCount).toBe(14);
          expect(allCategories.categories[1].restaurantCount).toBe(16);
          expect(allCategories.error).toBe(null);
        });
    });
  });

  describe('category', () => {
    it('should load restaurants', async () => {
      return publicTest(`
        query {
          category(slug: "korean-food", page: 2, take:8) {
            ok
            error
            totalPages
            category {
              name
              slug
              restaurantCount
            }
            restaurants {
             id
             name
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
              data: { category },
            },
          } = res;
          expect(category.ok).toBe(true);
          expect(category.category.restaurantCount).toBe(14);
          expect(category.totalPages).toBe(2);
          expect(category.totalResults).toBe(14);
          expect(category.error).toBe(null);
        });
    });

    it('should not load if category is not found', async () => {
      return publicTest(`
        query {
          category(slug: "japanese-food", page: 2, take:8) {
            ok
            error
            totalPages
            category {
              name
              slug
              restaurantCount
            }
            restaurants {
             id
             name
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
              data: { category },
            },
          } = res;
          expect(category.ok).toBe(false);
          expect(category.category).toBe(null);
          expect(category.error).toBe('Category not found');
        });
    });
  });

  describe('restaurants', () => {
    it('should load all restaurants', async () => {
      return publicTest(`
        query {
          restaurants(page:2, take:10) {
            ok
            error
            totalPages
            totalResults
            results {
              name
              menu {
                name
                id
                price
                options {
                  name
                  choices {
                    name
                    extra
                  }
                }
              }
            }
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { restaurants },
            },
          } = res;
          expect(restaurants.ok).toBe(true);
          expect(restaurants.error).toBe(null);
          expect(restaurants.totalPages).toBe(3);
          expect(restaurants.totalResults).toBe(30);
          expect(restaurants.results.length).toBe(10);
        });
    });
  });

  describe('restaurant', () => {
    it('should load restaurant', async () => {
      return publicTest(`
        query {
          restaurant(restaurantId: 16) {
            ok
            error
            restaurant {
              id
              name
              menu {
                name
                id
                price
                options {
                  name
                  choices {
                    name
                    extra
                  }
                }
              }
            }
          }
        }
     `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { restaurant },
            },
          } = res;
          expect(restaurant.ok).toBe(true);
          expect(restaurant.error).toBe(null);
          expect(restaurant.restaurant).toMatchObject({
            id: 16,
            name: 'test sea food restaurant1',
          });
        });
    });

    it('should fail if restaurant with id does not exist', async () => {
      return publicTest(`
        query {
          restaurant(restaurantId: 31) {
            ok
            error
            restaurant {
              id
              name
              menu {
                name
                id
                price
                options {
                  name
                  choices {
                    name
                    extra
                  }
                }
              }
              
            }
          }
        }
     `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { restaurant },
            },
          } = res;
          expect(restaurant.ok).toBe(false);
          expect(restaurant.error).toBe('Restaurant not found');
          expect(restaurant.restaurant).toBe(null);
        });
    });
  });

  describe('searchRestaurant', () => {
    it('should search restaurants', async () => {
      return publicTest(`
        query {
          searchRestaurant(query: "KOREAN", page:2, take:10) {
            ok
            error
            totalPages
            totalResults
            restaurants {
              id
              name
              menu {
                name
                id
                price
                options {
                  name
                  choices {
                    name
                    extra
                  }
                }
              }
            }
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { searchRestaurant },
            },
          } = res;
          expect(searchRestaurant.ok).toBe(true);
          expect(searchRestaurant.error).toBe(null);
          expect(searchRestaurant.totalPages).toBe(2);
          expect(searchRestaurant.totalResults).toBe(14);
          expect(searchRestaurant.restaurants.length).toBe(4);
        });
    });

    it('should not find restaurants', async () => {
      return publicTest(`
        query {
          searchRestaurant(query: "japanes", page:1, take:10) {
            ok
            error
            totalPages
            totalResults
            restaurants {
              id
              name
              menu {
                name
                id
                price
                options {
                  name
                  choices {
                    name
                    extra
                  }
                }
              }
            }
          }
        }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { searchRestaurant },
            },
          } = res;
          expect(searchRestaurant.ok).toBe(false);
          expect(searchRestaurant.error).toBe('Not found restaurant');
          expect(searchRestaurant.totalPages).toBe(null);
          expect(searchRestaurant.totalResults).toBe(null);
          expect(searchRestaurant.restaurants).toBe(null);
        });
    });
  });

  describe('CreateDish', () => {
    it('should fail if restaurant is not found', async () => {
      return privateTest(`
        mutation {
          createDish(
            name: "pizza"
            price: 10000
            description: "so delicious"
            options: [
              {
                name: "flavor"
                choices: [{name:"hot", extra:500},{name:"mild"}]
                allowMultipleChoices: false
                required: true
              },
              {name:"topping"
              choices:[{name:"pepper", extra:500}, {name:"spice",extra:500}]
                allowMultipleChoices:true
                required:false
              }
            ]       
            restaurantId: 100
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
                createDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Restaurant not found');
        });
    });

    it("should fail if accessed user is not restaurant's owner", async () => {
      //owner2로 로그인
      jwtToken = owner2Token;

      return privateTest(`
        mutation {
          createDish(
            name: "pizza"
            price: 10000
            description: "so delicious"
            options: [
              {
                name: "flavor"
                choices: [{name:"hot", extra:500},{name:"mild"}]
                allowMultipleChoices: false
                required: true
              },
              {name:"topping"
              choices:[{name:"pepper", extra:500}, {name:"spice",extra:500}]
                allowMultipleChoices:true
                required:false
              }
            ]       
            restaurantId: 1
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
                createDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe(
            "You can't add a dish to this restaurant that you don't own",
          );
        });
    });

    it('should create dish', async () => {
      return privateTest(`
        mutation {
          createDish(
            name: "pizza"
            price: 10000
            description: "so delicious"
            options: [
              {
                name: "flavor"
                choices: [{name:"hot", extra:500},{name:"mild"}]
                allowMultipleChoices: false
                required: true
              },
              {name:"topping"
              choices:[{name:"pepper", extra:500}, {name:"spice",extra:500}]
                allowMultipleChoices:true
                required:false
              }
            ]       
            restaurantId: 16
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
                createDish: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
  });

  describe('editDish', () => {
    it('should fail if dish is not found', async () => {
      return privateTest(`
        mutation {
          editDish(
            dishId: 2
            price: 11000
            options: [
              {
                name: "flavor"
                choices: [{ name: "hot", extra: 1000 }, { name: "mild" }]
                allowMultipleChoices: false
                required: true
              }
              {
                name: "topping"
                choices: [{ name: "pepper", extra: 500 }, { name: "spice", extra: 500 }]
                allowMultipleChoices: true
                required: false
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
                editDish: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe('Dish not found');
        });
    });

    it("should fail if accessed user is not restaurant's owner", async () => {
      //owner1으로 로그인
      jwtToken = owner1Token;

      return privateTest(`
        mutation {
          editDish(
            dishId: 1
            price: 11000
            options: [
              {
                name: "flavor"
                choices: [{ name: "hot", extra: 1000 }, { name: "mild" }]
                allowMultipleChoices: false
                required: true
              }
              {
                name: "topping"
                choices: [{ name: "pepper", extra: 500 }, { name: "spice", extra: 500 }]
                allowMultipleChoices: true
                required: false
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
                editDish: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe(
            "You can't edit dish of restaurant that you don't own",
          );
        });
    });

    it('should edit dish', async () => {
      //owner2로 로그인
      jwtToken = owner2Token;

      return privateTest(`
        mutation {
          editDish(
            dishId: 1
            price: 11000
            options: [
              {
                name: "flavor"
                choices: [{ name: "hot", extra: 1000 }, { name: "mild" }]
                allowMultipleChoices: false
                required: true
              }
              {
                name: "topping"
                choices: [{ name: "pepper", extra: 500 }, { name: "spice", extra: 500 }]
                allowMultipleChoices: true
                required: false
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
                editDish: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
  });

  describe('deleteDish', () => {
    it('should fail if dish is not found', async () => {
      return privateTest(`
          mutation {
            deleteDish(dishId:2) {
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
                deleteDish: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe('Dish not found');
        });
    });

    it("should fail if accessed user is not restaurant's owner", async () => {
      //owner1으로 로그인
      jwtToken = owner1Token;

      return privateTest(`
          mutation {
            deleteDish(dishId:1) {
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
                deleteDish: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(false);
          expect(error).toBe(
            "You can't delete dish of restaurant that you don't own",
          );
        });
    });

    it('should delete dish', async () => {
      //owner2로 로그인
      jwtToken = owner2Token;

      return privateTest(`
          mutation {
            deleteDish(dishId:1) {
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
                deleteDish: { ok, error },
              },
            },
          } = res;

          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
  });
});
