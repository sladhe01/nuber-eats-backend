import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  //개발용 cors세팅 나중에 바꿔야함
  app.enableCors({ origin: 'http://localhost:3000' });
  await app.listen(4000);
}
bootstrap();
