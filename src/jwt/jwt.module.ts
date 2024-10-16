import { DynamicModule, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { JwtModuleOptions } from './jwt.interfaces';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { UsersModule } from 'src/users/users.module';
import { JwtMiddleware } from './jwt.middleware';

@Module({})
export class JwtModule {
  static forRoot(options: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService, JwtMiddleware],
      providers: [
        { provide: CONFIG_OPTIONS, useValue: options },
        JwtService,
        JwtMiddleware,
      ],
      global: options.isGlobal,
      imports: [UsersModule],
    };
  }
}
