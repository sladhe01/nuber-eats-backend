import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryResolver, RestaurantsResolver } from './restaurants.resolver';
import { Category } from './entities/category.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category])],
  providers: [
    RestaurantService,
    RestaurantsResolver,
    CategoryResolver,
    CategoryRepository,
    RestaurantRepository,
  ],
})
export class RestaurantsModule {}
