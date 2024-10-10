import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, ManyToOne, RelationId } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@InputType('ChoiceInputType')
@ObjectType()
export class DishChoice {
  @Field(() => String)
  name: string;

  @Field(() => Int, { defaultValue: 0 })
  extra: number;
}

//CreateDishInput에서 PickType으로 개별 하나가 아니라 객체를 뽑아 갈때는 ArgsType으로 하지 못한다, 그리고 따로 이름을 붙여줘야 밑의 ObjectType과 별개의 것으로 인식하여 에러를 내지 않는다.
@ObjectType()
@InputType('DishOptionInputType')
export class DishOption {
  @Field(() => String)
  name: string;

  @Field(() => [DishChoice])
  choices: DishChoice[];

  //false면 choices에서 라디오 버튼으로 택1이고 true면 체크박스로 복수 선택 가능
  @Field(() => Boolean)
  allowMultipleChoices: boolean;

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

  /*
  options는 변동이 잦기 떄문에 관게형 테이블이 아닌 json타입을 차용하기로 결정
  만약 관계형 테이블을 쓴다면 option을 수정하면서 과거 주문내역에 지장이 가지 않으려면
  수정이 아니라 새로운 옵션을 만들어 dish와 관계를 맺어주고 기존 옵션은 softDelete 해야하는데 이렇게 하면 로직이 복잡해짐
  */
  @Column({ type: 'json', nullable: true })
  @Field(() => [DishOption], { nullable: true })
  options?: DishOption[];
}
