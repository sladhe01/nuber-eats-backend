import { ArgsType, Field, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Verification } from '../entities/verification.entity';

@ObjectType()
export class VerifyEmailOutput extends CoreOutput {}

@ArgsType()
export class VerifyEmailInput extends PickType(
  Verification,
  ['code'],
  ArgsType,
) {}
