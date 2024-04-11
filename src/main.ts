import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cluster from 'cluster';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

const count = 3;

if ((cluster as any).isPrimary) {
  for (let i = 0; i < count; i++) {
    (cluster as any).fork();
  }
} else {
  bootstrap();
}
