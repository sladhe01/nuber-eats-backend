import { ArgsType, Field, ObjectType, OmitType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class CreateAccountInput extends OmitType(
  User,
  ['id', 'createdAt', 'updatedAt'],
  ArgsType,
) {}

@ObjectType()
export class CreateAccountOutput extends CoreOutput {}
