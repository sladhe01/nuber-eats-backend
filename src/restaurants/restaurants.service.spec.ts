import { Test } from '@nestjs/testing';
import { RestaurantService } from './restaurants.service';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Restaurant } from './entities/restaurant.entity';
import { Category } from './entities/category.entity';
import { ILike, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dish } from './entities/dish.entity';

jest.mock('./repositories/category.repository');
jest.mock('./repositories/restaurant.repository');

const mockRepository = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
});

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('RestaurntService', () => {
  let service: RestaurantService;
  let restaurantRepository: jest.Mocked<RestaurantRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let dishRepository: MockRepository<Dish>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        RestaurantRepository,
        CategoryRepository,
        { provide: getRepositoryToken(Dish), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository =
      module.get<jest.Mocked<RestaurantRepository>>(RestaurantRepository);
    categoryRepository =
      module.get<jest.Mocked<CategoryRepository>>(CategoryRepository);
    dishRepository = module.get<MockRepository<Dish>>(getRepositoryToken(Dish));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const mockedOwner = { id: 1, role: UserRole.Client };
    const createRestaurantArgs = {
      name: 'mockingRestaurant',
      coverImg: 'http://',
      address: 'Seoul',
      categoryName: 'Korean food',
    };
    const mockedRestaurant = {
      id: 1,
      name: 'mockingRestaurant',
      coverImg: 'http://',
      address: 'Seoul',
    };
    const mockedCategory = { id: 1, name: 'korean food', slug: 'korean-food' };

    it('should fail if category is not found', async () => {
      restaurantRepository.create.mockReturnValue(
        mockedRestaurant as Restaurant,
      );
      categoryRepository.getCategory.mockResolvedValue(null);
      const result = await service.createRestaurant(
        mockedOwner as User,
        createRestaurantArgs,
      );
      expect(restaurantRepository.create).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.create).toHaveBeenCalledWith(
        createRestaurantArgs,
      );
      expect(categoryRepository.getCategory).toHaveBeenCalledTimes(1);
      expect(categoryRepository.getCategory).toHaveBeenCalledWith(
        createRestaurantArgs.categoryName,
      );
      expect(result).toMatchObject({ ok: false, error: 'Not found category' });
    });

    it('should create a new restaurant', async () => {
      restaurantRepository.create.mockReturnValue(
        mockedRestaurant as Restaurant,
      );
      categoryRepository.getCategory.mockResolvedValue(
        mockedCategory as Category,
      );
      restaurantRepository.save.mockResolvedValue(
        mockedRestaurant as Restaurant,
      );

      const result = await service.createRestaurant(
        mockedOwner as User,
        createRestaurantArgs,
      );

      expect(restaurantRepository.create).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.create).toHaveBeenCalledWith(
        createRestaurantArgs,
      );
      expect(categoryRepository.getCategory).toHaveBeenCalledTimes(1);
      expect(categoryRepository.getCategory).toHaveBeenCalledWith(
        createRestaurantArgs.categoryName,
      );
      expect(restaurantRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.save).toHaveBeenCalledWith({
        ...mockedRestaurant,
        owner: mockedOwner,
        category: mockedCategory,
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      restaurantRepository.create.mockImplementation(() => {
        throw new Error();
      });

      const result = await service.createRestaurant(
        mockedOwner as User,
        createRestaurantArgs,
      );
      expect(result).toMatchObject({
        ok: false,
        error: 'Could not create restaurant',
      });
    });
  });

  describe('editRestaurant', () => {
    const mockedOwner = { id: 1, role: UserRole.Client };
    const editRestaurantArgs = {
      name: 'mockingRestaurant2',
      coverImg: 'http://2',
      address: 'Busan',
      categoryName: 'Sea food',
      restaurantId: 1,
    };
    const mockedRestaurant = {
      id: 1,
      name: 'mockingRestaurant',
      coverImg: 'http://',
      address: 'Seoul',
    };

    it('should fail if restaurant is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);

      const result = await service.editRestaurant(
        mockedOwner as User,
        editRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: editRestaurantArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it("should fail if restaurant's owner does not matched with accessed user", async () => {
      restaurantRepository.findOne.mockResolvedValue({
        ...mockedRestaurant,
        ownerId: 2,
      } as Restaurant);
      const result = await service.editRestaurant(
        mockedOwner as User,
        editRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: editRestaurantArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: "You can't edit a restaurant that you don't own",
      });
    });

    it('should fail if a category to edit is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue({
        ...mockedRestaurant,
        ownerId: 1,
      } as Restaurant);
      categoryRepository.getCategory.mockResolvedValue(null);

      const result = await service.editRestaurant(
        mockedOwner as User,
        editRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: editRestaurantArgs.restaurantId },
      });
      expect(categoryRepository.getCategory).toHaveBeenCalledTimes(1);
      expect(categoryRepository.getCategory).toHaveBeenCalledWith(
        editRestaurantArgs.categoryName,
      );
      expect(result).toMatchObject({
        ok: false,
        error: 'Not found category',
      });
    });

    it('should edit restaurant', async () => {
      const mockedCategory = { id: 2, name: 'sea food', slug: 'sea-food' };
      const editedRestaurant = {
        id: 1,
        name: 'mockingRestaurant2',
        coverImg: 'http://2',
        address: 'Busan',
        category: mockedCategory,
      };
      restaurantRepository.findOne.mockResolvedValue({
        ...mockedRestaurant,
        ownerId: 1,
      } as Restaurant);
      categoryRepository.getCategory.mockResolvedValue(
        mockedCategory as Category,
      );
      restaurantRepository.save.mockResolvedValue(
        editedRestaurant as Restaurant,
      );

      const result = await service.editRestaurant(
        mockedOwner as User,
        editRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: editRestaurantArgs.restaurantId },
      });
      expect(categoryRepository.getCategory).toHaveBeenCalledTimes(1);
      expect(categoryRepository.getCategory).toHaveBeenCalledWith(
        editRestaurantArgs.categoryName,
      );
      expect(restaurantRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.save).toHaveBeenCalledWith({
        id: editRestaurantArgs.restaurantId,
        ...editRestaurantArgs,
        category: mockedCategory,
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editRestaurant(
        mockedOwner as User,
        editRestaurantArgs,
      );
      expect(result).toMatchObject({
        ok: false,
        error: 'Could not update restaurant',
      });
    });
  });

  describe('deleteRestaurant', () => {
    const mockedUser = { id: 1, role: UserRole.Client };
    const deleteRestaurantArgs = { restaurantId: 1 };
    const mockedRestaurant = {
      id: 1,
      name: 'mockingRestaurant',
      coverImg: 'http://',
      address: 'Seoul',
    };

    it('should fail if restaurant to deleted is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);

      const result = await service.deleteRestaurant(
        mockedUser as User,
        deleteRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteRestaurantArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Restaurant not found',
      });
    });
    it("should fail if restaurnt's owner is not match with access user", async () => {
      restaurantRepository.findOne.mockResolvedValue({
        ...mockedRestaurant,
        ownerId: 2,
      } as Restaurant);

      const result = await service.deleteRestaurant(
        mockedUser as User,
        deleteRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteRestaurantArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: "You can't delete a restaurant that you don't own",
      });
    });

    it('should delete a restaurant', async () => {
      restaurantRepository.findOne.mockResolvedValue({
        ...mockedRestaurant,
        ownerId: 1,
      } as Restaurant);
      restaurantRepository.delete.mockResolvedValue(expect.any(Object));

      const result = await service.deleteRestaurant(
        mockedUser as User,
        deleteRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteRestaurantArgs.restaurantId },
      });
      expect(restaurantRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.softDelete).toHaveBeenCalledWith(
        deleteRestaurantArgs.restaurantId,
      );
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());

      const result = await service.deleteRestaurant(
        mockedUser as User,
        deleteRestaurantArgs,
      );

      expect(result).toMatchObject({ ok: false, error: 'Could not delete' });
    });
  });

  describe('allCategories', () => {
    it('should fail on exception', async () => {
      categoryRepository.find.mockRejectedValue(new Error());

      const result = await service.allCategories();

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not load categories',
      });
    });

    it('should load all categories', async () => {
      categoryRepository.find.mockResolvedValue(expect.any(Array));

      const result = await service.allCategories();

      expect(result).toMatchObject({ ok: true, categories: expect.any(Array) });
    });
  });

  describe('countRestaurants', () => {
    const mockedCategory = { id: 1 };
    it('should count restaurants match with the category', async () => {
      restaurantRepository.count.mockResolvedValue(10);
      const result = await service.countRestaurants(mockedCategory as Category);
      expect(result).toBe(10);
    });
  });

  describe('findCategoryBySlug', () => {
    const findCategoryBySlugArgs = { slug: 'test-food', page: 3, take: 10 };
    const mockedCategory = { id: 1 };
    it('should fail if category is not found ', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toHaveBeenCalledTimes(1);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });
      expect(result).toMatchObject({ ok: false, error: 'Category not found' });
    });

    it('should load restaurant matching with the category', async () => {
      categoryRepository.findOne.mockResolvedValue(mockedCategory as Category);
      restaurantRepository.pagenatedFindAndCount.mockResolvedValue([
        expect.any(Array),
        25,
      ]);
      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toHaveBeenCalledTimes(1);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });
      expect(restaurantRepository.pagenatedFindAndCount).toHaveBeenCalledTimes(
        1,
      );
      expect(restaurantRepository.pagenatedFindAndCount).toHaveBeenCalledWith({
        page: findCategoryBySlugArgs.page,
        take: findCategoryBySlugArgs.take,
        where: { category: { id: mockedCategory.id } },
      });
      expect(result).toMatchObject({
        ok: true,
        category: mockedCategory,
        restaurants: expect.any(Array),
        totalPages: 3,
      });
    });

    it('should fail on exception', async () => {
      categoryRepository.findOne.mockRejectedValue(new Error());

      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not load category',
      });
    });
  });

  describe('allRestaurants', () => {
    const allRestaurantsArgs = { page: 2, take: 10 };
    it('should load all restaurants', async () => {
      restaurantRepository.pagenatedFindAndCount.mockResolvedValue([
        expect.any(Array),
        25,
      ]);

      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(result).toMatchObject({
        ok: true,
        results: expect.any(Array),
        totalPages: 3,
        totalResults: 25,
      });
    });

    it('should fail on exception', async () => {
      restaurantRepository.pagenatedFindAndCount.mockRejectedValue(new Error());

      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not load restaurants',
      });
    });
  });

  describe('findRestaurantById', () => {
    const findRestaurantByIdArgs = { restaurantId: 1 };
    const mockedRestaurant = {
      id: 1,
      name: 'test-restaurant',
    };
    it('should fail if restaurant is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
        relations: { menu: true },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should load restaurant', async () => {
      restaurantRepository.findOne.mockResolvedValue(
        mockedRestaurant as Restaurant,
      );

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
        relations: { menu: true },
      });
      expect(result).toMatchObject({ ok: true, restaurant: mockedRestaurant });
    });

    it('sould fail on exception', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not find restaurant',
      });
    });
  });

  describe('searchRestaurantByName', () => {
    const searchRestaurantByNameArgs = { query: 'chicken', page: 2, take: 10 };

    it('should fail if restaurant is not found', async () => {
      restaurantRepository.pagenatedFindAndCount.mockResolvedValue([[], 0]);

      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(restaurantRepository.pagenatedFindAndCount).toHaveBeenCalledTimes(
        1,
      );
      expect(restaurantRepository.pagenatedFindAndCount).toHaveBeenCalledWith({
        where: { name: ILike(`%${searchRestaurantByNameArgs.query}%`) },
        take: searchRestaurantByNameArgs.take,
        page: searchRestaurantByNameArgs.page,
        relations: { menu: true },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Not found restaurant',
      });
    });

    it('should load restaurants', async () => {
      restaurantRepository.pagenatedFindAndCount.mockResolvedValue([
        expect.any(Array),
        25,
      ]);

      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(restaurantRepository.pagenatedFindAndCount).toHaveBeenCalledTimes(
        1,
      );
      expect(restaurantRepository.pagenatedFindAndCount).toHaveBeenCalledWith({
        where: { name: ILike(`%${searchRestaurantByNameArgs.query}%`) },
        take: searchRestaurantByNameArgs.take,
        page: searchRestaurantByNameArgs.page,
        relations: { menu: true },
      });
      expect(result).toMatchObject({
        ok: true,
        restaurants: expect.any(Array),
        totalPages: 3,
        totalResults: 25,
      });
    });

    it('should fail on exception', async () => {
      restaurantRepository.pagenatedFindAndCount.mockRejectedValue(new Error());

      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not search for restaurants',
      });
    });
  });

  describe('createDish', () => {
    const mockedOwner = {
      id: 1,
      email: 'test@owner.com',
      role: UserRole.Owner,
    };
    const mockedRestaurant = { id: 1, ownerId: 1 };
    const createDishArgs = {
      restaurantId: 1,
      name: 'pepperoni pizza',
      photo: 'https://pizza.jpeg',
      price: 10000,
      description: 'NY pepperoni pizza',
      options: [
        {
          name: 'size',
          choices: [
            { name: 'S', extra: 0 },
            { name: 'M', extra: 3000 },
            { name: 'L', extra: 5000 },
          ],
          allowMultipleChoices: false,
          required: true,
        },
        {
          name: 'topping',
          allowMultipleChoices: true,
          required: false,
          choices: [
            { name: 'extra cheese', extra: 2000 },
            { name: 'extra pepperoni', extra: 3000 },
          ],
        },
      ],
    };
    it('should fail if restaurant is not found', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);

      const result = await service.createDish(
        mockedOwner as User,
        createDishArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDishArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it("should fail if the restaurant is not owner's restaurant", async () => {
      const anotherMockedRestaurant = { id: 2, ownerId: 2 };
      restaurantRepository.findOne.mockResolvedValue(
        anotherMockedRestaurant as Restaurant,
      );

      const result = await service.createDish(
        mockedOwner as User,
        createDishArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDishArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: "You can't add a dish to this restaurant that you don't own",
      });
    });

    it('should create dish', async () => {
      restaurantRepository.findOne.mockResolvedValue(
        mockedRestaurant as Restaurant,
      );
      dishRepository.create.mockReturnValue(createDishArgs);
      dishRepository.save.mockResolvedValue(createDishArgs);

      const result = await service.createDish(
        mockedOwner as User,
        createDishArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDishArgs.restaurantId },
      });
      expect(dishRepository.create).toHaveBeenCalledTimes(1);
      expect(dishRepository.create).toHaveBeenCalledWith({
        ...createDishArgs,
        restaurant: mockedRestaurant,
      });
      expect(dishRepository.save).toHaveBeenCalledTimes(1);
      expect(dishRepository.save).toHaveBeenCalledWith(createDishArgs);
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      restaurantRepository.findOne.mockRejectedValue(new Error());

      const result = await service.createDish(
        mockedOwner as User,
        createDishArgs,
      );

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not craete dish',
      });
    });
  });

  describe('deleteDish', () => {
    const mockedOwner = {
      id: 1,
      email: 'test@owner.com',
      role: UserRole.Owner,
    } as User;
    const deleteDishArgs = { dishId: 1 };
    const mockedRestaurant = { id: 1, ownerId: 1 } as Restaurant;
    const mockedDish = {
      id: 1,
      name: 'pizza',
      price: 10000,
      description: 'delicious',
      restaurant: mockedRestaurant,
    } as Dish;
    it('should fail if dish is not found', async () => {
      dishRepository.findOne.mockResolvedValue(null);

      const result = await service.deleteDish(mockedOwner, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteDishArgs.dishId },
        relations: { restaurant: true },
      });
      expect(result).toMatchObject({ ok: false, error: 'Dish not found' });
    });

    it("should fail if the restaurant is not owner's restaurant", async () => {
      const anotherRestaurant = { id: 2, ownerId: 2 } as Restaurant;
      const anotherMockedDish = {
        id: 2,
        name: 'chicken',
        price: 10000,
        description: 'amazing',
        restaurant: anotherRestaurant,
      } as Dish;
      dishRepository.findOne.mockResolvedValue(anotherMockedDish);

      const result = await service.deleteDish(mockedOwner, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteDishArgs.dishId },
        relations: { restaurant: true },
      });
      expect(result).toMatchObject({
        ok: false,
        error: "You can't delete dish of restaurant that you don't own",
      });
    });

    it('should delete dish', async () => {
      dishRepository.findOne.mockResolvedValue(mockedDish);
      dishRepository.softDelete.mockResolvedValue(expect.any(Object));

      const result = await service.deleteDish(mockedOwner, deleteDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteDishArgs.dishId },
        relations: { restaurant: true },
      });
      expect(dishRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(dishRepository.softDelete).toHaveBeenLastCalledWith(
        deleteDishArgs.dishId,
      );
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      dishRepository.findOne.mockRejectedValue(new Error());

      const result = await service.deleteDish(mockedOwner, deleteDishArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not delete dish',
      });
    });
  });

  describe('editDish', () => {
    const mockedOwner = {
      id: 1,
      email: 'test@owner.com',
      role: UserRole.Owner,
    } as User;
    const editDishArgs = { price: 12000, dishId: 1 };
    const mockedRestaurant = { id: 1, ownerId: 1 } as Restaurant;
    const mockedDish = {
      id: 1,
      name: 'pizza',
      price: 10000,
      description: 'delicious',
      restaurant: mockedRestaurant,
    } as Dish;

    it('should fail if dish is not found', async () => {
      dishRepository.findOne.mockResolvedValue(null);

      const result = await service.editDish(mockedOwner, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: editDishArgs.dishId },
        relations: { restaurant: true },
      });
      expect(result).toMatchObject({ ok: false, error: 'Dish not found' });
    });

    it("should fail if the restaurant is not owner's restaurant", async () => {
      const anotherRestaurant = { id: 2, ownerId: 2 } as Restaurant;
      const anotherMockedDish = {
        id: 2,
        name: 'chicken',
        price: 10000,
        description: 'amazing',
        restaurant: anotherRestaurant,
      } as Dish;
      dishRepository.findOne.mockResolvedValue(anotherMockedDish);

      const result = await service.editDish(mockedOwner, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: editDishArgs.dishId },
        relations: { restaurant: true },
      });
      expect(result).toMatchObject({
        ok: false,
        error: "You can't edit dish of restaurant that you don't own",
      });
    });

    it('should edit dish', async () => {
      dishRepository.findOne.mockResolvedValue(mockedDish);
      dishRepository.save.mockResolvedValue(expect.any(Object));

      const result = await service.editDish(mockedOwner, editDishArgs);

      expect(dishRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishRepository.findOne).toHaveBeenCalledWith({
        where: { id: editDishArgs.dishId },
        relations: { restaurant: true },
      });
      expect(dishRepository.save).toHaveBeenCalledTimes(1);
      expect(dishRepository.save).toHaveBeenLastCalledWith({
        id: editDishArgs.dishId,
        ...editDishArgs,
      });
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      dishRepository.findOne.mockRejectedValue(new Error());

      const result = await service.editDish(mockedOwner, editDishArgs);

      expect(result).toMatchObject({ ok: false, error: 'Could not edit dish' });
    });
  });
});
