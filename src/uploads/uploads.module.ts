import { DynamicModule, Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsOptions } from './uploads.interface';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

@Module({})
export class UploadsModule {
  static forRoot(options: UploadsOptions): DynamicModule {
    return {
      module: UploadsModule,
      providers: [{ provide: CONFIG_OPTIONS, useValue: options }],
      controllers: [UploadsController],
      global: options.isGlobal,
    };
  }
}
