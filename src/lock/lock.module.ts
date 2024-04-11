import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/db/db.module';
import { lockProviders } from './lock.provider';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [...lockProviders],
  exports: [...lockProviders],
})
export class LockModule {}
