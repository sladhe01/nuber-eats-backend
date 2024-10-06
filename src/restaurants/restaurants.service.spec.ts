import { Test } from '@nestjs/testing';
import { RestaurantService } from './restaurants.service';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { User } from 'src/users/entities/user.entity';
import { Restaurant } from './entities/restaurant.entity';
import { Category } from './entities/category.entity';
import { find } from 'rxjs';
import { ILike } from 'typeorm';

jest.mock('./repositories/category.repository');
jest.mock('./repositories/restaurant.repository');

describe('RestaurntService', () => {
  let service: RestaurantService;
  let restaurantRepository: jest.Mocked<RestaurantRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RestaurantService, RestaurantRepository, CategoryRepository],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    restaurantRepository = module.get(RestaurantRepository);
    categoryRepository = module.get(CategoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    const mockedOwner = { id: 1, role: 'Client' };
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
      jest
        .spyOn(restaurantRepository, 'create')
        .mockReturnValue(mockedRestaurant as Restaurant);
      jest.spyOn(categoryRepository, 'getCategory').mockResolvedValue(null);
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
      jest
        .spyOn(restaurantRepository, 'create')
        .mockReturnValue(mockedRestaurant as Restaurant);
      jest
        .spyOn(categoryRepository, 'getCategory')
        .mockResolvedValue(mockedCategory as Category);
      jest
        .spyOn(restaurantRepository, 'save')
        .mockResolvedValue(mockedRestaurant as Restaurant);

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
      jest.spyOn(restaurantRepository, 'create').mockImplementation(() => {
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
    const mockedOwner = { id: 1, role: 'Client' };
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
      jest.spyOn(restaurantRepository, 'findOne').mockResolvedValue(null);

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
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockResolvedValue({ ...mockedRestaurant, ownerId: 2 } as Restaurant);
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
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockResolvedValue({ ...mockedRestaurant, ownerId: 1 } as Restaurant);
      jest.spyOn(categoryRepository, 'getCategory').mockResolvedValue(null);

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
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockResolvedValue({ ...mockedRestaurant, ownerId: 1 } as Restaurant);
      jest
        .spyOn(categoryRepository, 'getCategory')
        .mockResolvedValue(mockedCategory as Category);
      jest
        .spyOn(restaurantRepository, 'save')
        .mockResolvedValue(editedRestaurant as Restaurant);

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
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockRejectedValue(new Error());

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
    const mockedUser = { id: 1, role: 'Client' };
    const deleteRestaurantArgs = { restaurantId: 1 };
    const mockedRestaurant = {
      id: 1,
      name: 'mockingRestaurant',
      coverImg: 'http://',
      address: 'Seoul',
    };

    it('should fail if restaurant to deleted is not found', async () => {
      jest.spyOn(restaurantRepository, 'findOne').mockResolvedValue(null);

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
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockResolvedValue({ ...mockedRestaurant, ownerId: 2 } as Restaurant);

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
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockResolvedValue({ ...mockedRestaurant, ownerId: 1 } as Restaurant);
      jest
        .spyOn(restaurantRepository, 'delete')
        .mockResolvedValue(expect.any(Object));

      const result = await service.deleteRestaurant(
        mockedUser as User,
        deleteRestaurantArgs,
      );

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteRestaurantArgs.restaurantId },
      });
      expect(restaurantRepository.delete).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.delete).toHaveBeenCalledWith(
        deleteRestaurantArgs.restaurantId,
      );
      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockRejectedValue(new Error());

      const result = await service.deleteRestaurant(
        mockedUser as User,
        deleteRestaurantArgs,
      );

      expect(result).toMatchObject({ ok: false, error: 'Could not delete' });
    });
  });

  describe('allCategories', () => {
    it('should fail on exception', async () => {
      jest.spyOn(categoryRepository, 'find').mockRejectedValue(new Error());

      const result = await service.allCategories();

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not load categories',
      });
    });

    it('should load all categories', async () => {
      jest
        .spyOn(categoryRepository, 'find')
        .mockResolvedValue(expect.any(Array));

      const result = await service.allCategories();

      expect(result).toMatchObject({ ok: true, categories: expect.any(Array) });
    });
  });

  describe('countRestaurants', () => {
    const mockedCategory = { id: 1 };
    it('should count restaurants match with the category', async () => {
      jest.spyOn(restaurantRepository, 'count').mockResolvedValue(10);
      const result = await service.countRestaurants(mockedCategory as Category);
      expect(result).toBe(10);
    });
  });

  describe('findCategoryBySlug', () => {
    const findCategoryBySlugArgs = { slug: 'test-food', page: 3, take: 10 };
    const mockedCategory = { id: 1 };
    it('should fail if category is not found ', async () => {
      jest.spyOn(categoryRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findCategoryBySlug(findCategoryBySlugArgs);

      expect(categoryRepository.findOne).toHaveBeenCalledTimes(1);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: findCategoryBySlugArgs.slug },
      });
      expect(result).toMatchObject({ ok: false, error: 'Category not found' });
    });

    it('should load restaurant matching with the category', async () => {
      jest
        .spyOn(categoryRepository, 'findOne')
        .mockResolvedValue(mockedCategory as Category);
      jest
        .spyOn(restaurantRepository, 'pagenatedFindAndCount')
        .mockResolvedValue([expect.any(Array), 25]);
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
      jest.spyOn(categoryRepository, 'findOne').mockRejectedValue(new Error());

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
      jest
        .spyOn(restaurantRepository, 'pagenatedFindAndCount')
        .mockResolvedValue([expect.any(Array), 25]);

      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(result).toMatchObject({
        ok: true,
        results: expect.any(Array),
        totalPages: 3,
        totalResults: 25,
      });
    });

    it('should fail on exception', async () => {
      jest
        .spyOn(restaurantRepository, 'pagenatedFindAndCount')
        .mockRejectedValue(new Error());

      const result = await service.allRestaurants(allRestaurantsArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not load restaurants',
      });
    });
  });

  describe('findRestaurantById', () => {
    const findRestaurantByIdArgs = { restaurantId: 1 };
    const mockedRestaurant = { id: 1, name: 'test-restaurant' };
    it('should fail if restaurant is not found', async () => {
      jest.spyOn(restaurantRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should load restaurant', async () => {
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockResolvedValue(mockedRestaurant as Restaurant);

      const result = await service.findRestaurantById(findRestaurantByIdArgs);

      expect(restaurantRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: findRestaurantByIdArgs.restaurantId },
      });
      expect(result).toMatchObject({ ok: true, restaurant: mockedRestaurant });
    });

    it('sould fail on exception', async () => {
      jest
        .spyOn(restaurantRepository, 'findOne')
        .mockRejectedValue(new Error());

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
      jest
        .spyOn(restaurantRepository, 'pagenatedFindAndCount')
        .mockResolvedValue([[], 0]);

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
      });
      expect(result).toMatchObject({
        ok: false,
        error: 'Not found restaurant',
      });
    });

    it('should load restaurants', async () => {
      jest
        .spyOn(restaurantRepository, 'pagenatedFindAndCount')
        .mockResolvedValue([expect.any(Array), 25]);

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
      });
      expect(result).toMatchObject({
        ok: true,
        restaurants: expect.any(Array),
        totalPages: 3,
        totalResults: 25,
      });
    });

    it('should fail on exception', async () => {
      jest
        .spyOn(restaurantRepository, 'pagenatedFindAndCount')
        .mockRejectedValue(new Error());

      const result = await service.searchRestaurantByName(
        searchRestaurantByNameArgs,
      );

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not search for restaurants',
      });
    });
  });
});
