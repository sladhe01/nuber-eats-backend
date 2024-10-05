import { ArgsType, Field, ObjectType } from '@nestjs/graphql';
import { IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@ArgsType()
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Column({ unique: true })
  @Field(() => String)
  @IsString()
  name: string;

  @Column()
  @Field(() => String)
  @IsString()
  coverImg: string;

  @Column({ unique: true })
  @Field(() => String)
  @IsString()
  slug: string;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.category, {
    nullable: true,
  })
  @Field(() => [Restaurant], { nullable: true })
  restaurants?: Restaurant[];
}
