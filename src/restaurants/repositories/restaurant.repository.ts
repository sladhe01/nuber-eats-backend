import { Repository, DataSource, FindManyOptions } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Restaurant } from '../entities/restaurant.entity';

type PagenatedFindAndCountInput = {
  page?: number;
} & FindManyOptions<Restaurant>;

@Injectable()
export class RestaurantRepository extends Repository<Restaurant> {
  constructor(private dataSource: DataSource) {
    super(Restaurant, dataSource.createEntityManager());
  }
  async pagenatedFindAndCount({
    page,
    take,
    ...options
  }: PagenatedFindAndCountInput): Promise<[Restaurant[], number]> {
    return await this.findAndCount({
      take,
      skip: (page - 1) * take,
      ...options,
    });
  }
}
