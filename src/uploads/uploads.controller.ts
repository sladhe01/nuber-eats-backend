import {
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { UploadsOptions } from './uploads.interface';

const BUCKET_NAME = 'sladhenubereats';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: UploadsOptions,
  ) {}
  @Post('')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    AWS.config.update({
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
    });
    try {
      const objectName = `${Date.now() + file.originalname}`;
      const { Location: fileUrl } = await new AWS.S3()
        .upload({
          Bucket: BUCKET_NAME,
          Body: file.buffer,
          Key: objectName,
          ContentType: file.mimetype,
        })
        .promise();
      return { url: fileUrl };
    } catch (e) {
      return null;
    }
  }
}
