import { DynamicModule, Module } from '@nestjs/common';
import { MailModuleOptions } from './mail.interfaces';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailService } from './mail.service';

@Module({})
export class MailModule {
  static forRoot(options: MailModuleOptions): DynamicModule {
    return {
      module: MailModule,
      providers: [{ provide: CONFIG_OPTIONS, useValue: options }, MailService],
      exports: [MailService],
      global: options.isGlobal,
    };
  }
}
