import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import * as Joi from 'joi';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { JwtModule } from './jwt/jwt.module';
import { JwtMiddleware } from './jwt/jwt.middleware';
import { Verification } from './users/entities/verification.entity';
import { MailModule } from './mail/mail.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { Category } from './restaurants/entities/category.entity';
import { Restaurant } from './restaurants/entities/restaurant.entity';
import { AuthModule } from './auth/auth.module';
import { Dish } from './restaurants/entities/dish.entity';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import {
  NaverPayment,
  PaddlePayment,
  CommonPayment,
} from './payments/entities/payment.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env.test',
      ignoreEnvFile: process.env.NODE_ENV === 'prod',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('dev', 'prod', 'test').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.string().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        PRIVATE_KEY: Joi.string().required(),
        MAILGUN_API_KEY: Joi.string().required(),
        MAILGUN_DOMAIN_NAME: Joi.string().required(),
        MAILGUN_FROM_EMAIL: Joi.string().required(),
        S3_ACCESS_KEY_ID: Joi.string().required(),
        S3_SECRET_ACCESS_KEY: Joi.string().required(),
      }),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [JwtModule],
      inject: [JwtMiddleware],
      driver: ApolloDriver,
      useFactory: async (jwtMiddleware: JwtMiddleware) => ({
        autoSchemaFile: true,
        context: async ({ req, extra }) => {
          if (req) {
            return { user: req['user'] };
          } else if (extra) {
            return { user: extra.request.user };
          }
        },
        subscriptions: {
          'graphql-ws': {
            onConnect: async (context) => {
              const { connectionParams, extra } = context;
              try {
                if (extra['request'] && connectionParams) {
                  const req = extra['request'];
                  req.headers['x-jwt'] = connectionParams['x-jwt'];
                  await jwtMiddleware.processRequestHeaders(req);
                }
              } catch (e) {}
            },
          },
        },
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: process.env.NODE_ENV !== 'prod',
      logging:
        process.env.NODE_ENV !== 'prod' && process.env.NODE_ENV !== 'test',
      entities: [
        User,
        Verification,
        Category,
        Restaurant,
        Dish,
        Order,
        OrderItem,
        CommonPayment,
        PaddlePayment,
        NaverPayment,
      ],
    }),
    JwtModule.forRoot({ isGlobal: true, privateKey: process.env.PRIVATE_KEY }),
    MailModule.forRoot({
      isGlobal: true,
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN_NAME,
      fromEmail: process.env.MAILGUN_FROM_EMAIL,
    }),
    AuthModule,
    UsersModule,
    RestaurantsModule,
    OrdersModule,
    CommonModule,
    PaymentsModule,
    ScheduleModule.forRoot(),
    UploadsModule.forRoot({
      isGlobal: true,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .forRoutes({ path: '/graphql', method: RequestMethod.POST });
  }
}
