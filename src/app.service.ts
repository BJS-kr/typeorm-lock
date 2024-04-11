import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LockService } from './lock/lock.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly lockService: LockService) {}

  private readonly locks: { name: string; cronExpression: string }[] = [
    {
      name: 'getHello',
      cronExpression: CronExpression.EVERY_5_SECONDS,
    },
  ];

  onModuleInit() {
    this.lockService.makeInitialLock(this.locks);
  }

  getHello(): string {
    return 'Hello World!';
  }

  @Cron(CronExpression.EVERY_5_SECONDS, {
    timeZone: 'Asia/Seoul',
  })
  async exclusiveGetHello() {
    return this.lockService.executeExclusively(
      'getHello',
      this.lockService.wrapAsRetryable(() => this.getHello(), {
        attempts: 3,
        delay: 1000,
        timeout: 5000,
      }),
      CronExpression.EVERY_5_SECONDS,
    );
  }
}
