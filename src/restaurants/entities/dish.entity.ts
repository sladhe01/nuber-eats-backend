import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, ManyToMany, ManyToOne, RelationId } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@InputType('ChoiceInputType')
@ObjectType()
class DishChoice {
  @Field(() => String)
  name: string;

  @Field(() => Int, { defaultValue: 0 })
  extra?: number;
}

//정석대로라면 options도
@InputType('DishOptionInputType') //CreateDishInput에서 PickType으로 개별 하나가 아니라 객체를 뽑아 갈때는 ArgsType으로 하지 못한다, 그리고 따로 이름을 붙여줘야 밑의 ObjectType과 별개의 것으로 인식하여 에러를 내지 않는다.
@ObjectType()
export class DishOption {
  @Field(() => String)
  name: string;

  @Field(() => [DishChoice])
  choices: DishChoice[];

  //필수선택사항은 choices에서 라디오 버튼으로 택1이고 필수가아니면 체크박스로 복수 선택 가능
  @Field(() => Boolean)
  required: boolean;
}

@InputType('DishInputType')
@ObjectType()
@Entity()
export class Dish extends CoreEntity {
  @Column()
  @Field(() => String)
  @IsString()
  name: string;

  @Column()
  @Field(() => Int)
  @IsInt()
  price: number;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  photo?: string;

  @Column()
  @Field(() => String)
  @IsString()
  @MaxLength(140)
  description: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.menu, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @Field(() => Restaurant)
  restaurant: Restaurant;

  @RelationId((dish: Dish) => dish.restaurant)
  restaurantId: number;

  @Column({ type: 'json', nullable: true })
  @Field(() => [DishOption], { nullable: true })
  options?: DishOption[];
}
