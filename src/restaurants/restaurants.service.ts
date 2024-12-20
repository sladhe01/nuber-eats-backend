import { Injectable } from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { User } from 'src/users/entities/user.entity';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { CategoryRepository } from './repositories/category.repository';
import { Category } from './entities/category.entity';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Dish } from './entities/dish.entity';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import { MyrestaurantsOutput } from './dtos/my-restaurants.dto';
import {
  MyRestaurantInput,
  MyRestaurantOutput,
} from './dtos/my-restaurant.dto';
import { GetDishInput, GetDishOutput } from './dtos/get-dish.dto';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly categories: CategoryRepository,
    @InjectRepository(Dish) private readonly dishes: Repository<Dish>,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getCategory(
        createRestaurantInput.categoryName,
      );
      if (!category) {
        return { ok: false, error: 'Not found category' };
      }
      //카테고리는 admin의 영역으로 미리 몇 가지 항목이 준비되어있어야 함
      //따로 Enum으로 할 건 아니고 프론트에서 선택지를 주고 그 선택지와 일치하는 문자열을 전달받을 예정,
      //없는 카테고리라고 여기서 새로 생성하지 않을 예정
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return { ok: true, restaurantId: newRestaurant.id };
    } catch (error) {
      return { ok: false, error: 'Could not create restaurant' };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: editRestaurantInput.restaurantId },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't edit a restaurant that you don't own",
        };
      }
      let category: Category;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getCategory(
          editRestaurantInput.categoryName,
        );
        if (!category) {
          return { ok: false, error: 'Not found category' };
        }
      }
      await this.restaurants.save({
        id: editRestaurantInput.restaurantId,
        ...editRestaurantInput,
        ...(category && { category }),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not update restaurant' };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't delete a restaurant that you don't own",
        };
      }
      await this.restaurants.softDelete(restaurantId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not delete' };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return { ok: true, categories };
    } catch (error) {
      return { ok: false, error: 'Could not load categories' };
    }
  }

  async countRestaurants(category: Category): Promise<number> {
    return await this.restaurants.count({
      where: { category: { id: category.id } },
    });
  }

  async findCategoryBySlug({
    slug,
    page,
    take,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({
        where: { slug },
      });
      if (!category) {
        return { ok: false, error: 'Category not found' };
      }
      const [restaurants, totalResults] =
        await this.restaurants.pagenatedFindAndCount({
          page,
          take,
          where: { category: { id: category.id } },
          order: { isPromoted: 'DESC' },
        });
      const totalPages = Math.ceil(totalResults / take);
      return { ok: true, category, restaurants, totalResults, totalPages };
    } catch (error) {
      return { ok: false, error: 'Could not load category' };
    }
  }

  async allRestaurants({
    page,
    take,
  }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [results, totalResults] =
        await this.restaurants.pagenatedFindAndCount({
          page,
          take,
          relations: { menu: true, category: true },
          order: { isPromoted: 'DESC' },
        });
      const totalPages = Math.ceil(totalResults / take);
      return { ok: true, results, totalPages, totalResults };
    } catch (error) {
      return { ok: false, error: 'Could not load restaurants' };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
        relations: { menu: true },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      return { ok: true, restaurant };
    } catch (error) {
      return { ok: false, error: 'Could not find restaurant' };
    }
  }

  async searchRestaurantByName({
    query,
    page,
    take,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] =
        await this.restaurants.pagenatedFindAndCount({
          where: { name: ILike(`%${query}%`) },
          take,
          page,
          relations: { menu: true },
          order: { isPromoted: 'DESC' },
        });
      if (restaurants.length === 0) {
        return { ok: false, error: 'Not found restaurant' };
      }
      const totalPages = Math.ceil(totalResults / take);
      return { ok: true, restaurants, totalPages, totalResults };
    } catch (error) {
      return { ok: false, error: 'Could not search for restaurants' };
    }
  }

  async createDish(
    owner: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: createDishInput.restaurantId },
      });
      if (!restaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't add a dish to this restaurant that you don't own",
        };
      }
      const newDish = this.dishes.create({ ...createDishInput, restaurant });
      await this.dishes.save(newDish);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not craete dish' };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: dishId },
        relations: { restaurant: true },
      });
      if (!dish) {
        return { ok: false, error: 'Dish not found' };
      }
      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't delete dish of restaurant that you don't own",
        };
      }
      await this.dishes.softDelete(dishId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not delete dish' };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: editDishInput.dishId },
        relations: { restaurant: true },
      });
      if (!dish) {
        return { ok: false, error: 'Dish not found' };
      }
      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't edit dish of restaurant that you don't own",
        };
      }
      await this.dishes.save({ id: editDishInput.dishId, ...editDishInput });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not edit dish' };
    }
  }

  async myRestaurants(owner: User): Promise<MyrestaurantsOutput> {
    try {
      const restaurants = await this.restaurants.find({
        where: { owner: { id: owner.id } },
      });
      return { restaurants, ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not find restaurants' };
    }
  }

  async myRestaurant(
    owner: User,
    { id }: MyRestaurantInput,
  ): Promise<MyRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { owner: { id: owner.id }, id },
        relations: ['menu', 'orders', 'owner'],
        order: { orders: { createdAt: 'ASC' } },
      });
      if (!restaurant || restaurant.ownerId !== owner.id) {
        return { ok: false, error: "You can't access" };
      }
      return { restaurant, ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not find restaurant' };
    }
  }

  async getDish({ id }: GetDishInput): Promise<GetDishOutput> {
    try {
      const dish = await this.dishes.findOne({ where: { id } });
      return { ok: true, dish };
    } catch (error) {
      return { ok: false, error: 'Could not find dish' };
    }
  }
}
