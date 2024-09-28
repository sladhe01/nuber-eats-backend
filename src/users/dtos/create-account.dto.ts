import { ArgsType, Field, ObjectType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class CreateAccountInput extends PickType(
  User,
  ['email', 'password', 'role'],
  ArgsType,
) {}

@ObjectType()
export class CreateAccountOutput extends CoreOutput {}
