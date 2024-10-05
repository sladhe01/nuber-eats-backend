import { Module } from '@nestjs/common';
import { RestaurantService } from './restaurants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryResolver, RestaurantsResolver } from './restaurants.resolver';
import { Category } from './entities/category.entity';
import { CategoryRepository } from './repositories/category.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category])],
  // // imports: [TypeOrmModule.forFeature([Restaurant, CategoryRepository])],
  // // imports: [TypeOrmModule.forFeature([Restaurant])],
  // providers: [RestaurantService, RestaurantsResolver],
  providers: [
    RestaurantService,
    RestaurantsResolver,
    CategoryResolver,
    CategoryRepository,
  ],
})
export class RestaurantsModule {}
