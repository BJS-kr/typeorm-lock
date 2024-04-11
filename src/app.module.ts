import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LockModule } from './lock/lock.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LockService } from './lock/lock.service';

@Module({
  imports: [LockModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, LockService],
})
export class AppModule {}
