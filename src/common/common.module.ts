import { Global, Module } from '@nestjs/common';
import { PUB_SUB } from './common.constants';
import { PubSub } from 'graphql-subscriptions';

//만약 여러 서버 사용해야 할 경우 graphql-redis-subscriptions 등 이용하면 됨 (https://www.npmjs.com/package/graphql-subscriptions#pubsub-implementations)
const pubsub = new PubSub();

@Global()
@Module({
  providers: [{ provide: PUB_SUB, useValue: pubsub }],
  exports: [PUB_SUB],
})
export class CommonModule {}
