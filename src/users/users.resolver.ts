import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './users.service';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { EditProfileInput, EditProfileOutput } from './dtos/eidt-profile.dto';

@Resolver()
export class UsersResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => CreateAccountOutput)
  async createAccount(
    @Args() createAccountInput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    try {
      return await this.userService.createAccount(createAccountInput);
    } catch (error) {
      return { ok: false, error };
    }
  }

  @Mutation(() => LoginOutput)
  async login(@Args() loginInput: LoginInput): Promise<LoginOutput> {
    try {
      return await this.userService.login(loginInput);
    } catch (error) {
      return { ok: false, error };
    }
  }

  @UseGuards(AuthGuard)
  @Query(() => User)
  me(@AuthUser() authUser: User) {
    return authUser;
  }

  @UseGuards(AuthGuard)
  @Query(() => UserProfileOutput)
  async userProfile(
    @Args() userProfileInput: UserProfileInput,
  ): Promise<UserProfileOutput> {
    try {
      const user = await this.userService.findById(userProfileInput.userId);
      if (!user) {
        throw Error();
      }
      return { ok: true, user };
    } catch (error) {
      return { ok: false, error: 'User Not Found' };
    }
  }

  @UseGuards(AuthGuard)
  @Mutation(() => EditProfileOutput)
  async editProfile(
    @AuthUser() authUser: User,
    @Args() editProfileInput: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      await this.userService.editProfile(authUser.id, editProfileInput);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }
}
