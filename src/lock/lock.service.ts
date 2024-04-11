import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Lock } from '../db/lock.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { parseExpression } from 'cron-parser';

@Injectable()
export class LockService {
  constructor(
    @Inject('LOCK_REPOSITORY')
    private readonly lockRepository: Repository<Lock>,
  ) {}

  async makeInitialLock(locks: { name: string; cronExpression: string }[]) {
    for (const lock of locks) {
      const atLeastOneLock = await this.lockRepository.findOne({
        where: {
          name: lock.name,
        },
      });

      if (!atLeastOneLock) {
        const newLock = new Lock();
        newLock.id = 0; // read는 concurrent하기 때문에 id를 0으로 고정해 여러 문서를 삽입할 수 없게 한다.
        newLock.name = lock.name;
        newLock.status = 'idle';
        newLock.executionableAt = parseExpression(lock.cronExpression, {
          tz: 'Asia/Seoul',
        })
          .next()
          .toDate();

        try {
          await this.lockRepository.save(newLock);
        } catch (err) {
          if (err.code !== 'ER_DUP_ENTRY') {
            throw err; // ER_DUP_ENTRY는 무시한다.
          }
        }
      }
    }
  }

  static wrapAsRetryable(
    fn: () => any,
    retryOption: {
      attempts: number;
      delay: number;
      timeout: number;
    },
  ) {
    let retried = 0;
    let timeoutId: NodeJS.Timeout;
    const retryable = async () => {
      try {
        timeoutId = setTimeout(() => {
          throw new Error('execution timeout');
        }, retryOption.timeout);
        const result = await fn();
        clearTimeout(timeoutId);

        return result;
      } catch (err) {
        clearTimeout(timeoutId);

        if (retried > retryOption.attempts) {
          throw err; // executeExclusively에서 catch로 넘어가게 하기 위하여 throw를 사용한다.
        }
        await new Promise((resolve) => setTimeout(resolve, retryOption.delay)); // sleep

        retried++;
        return retryable();
      }
    };

    return retryable;
  }

  async executeExclusively(
    key: string,
    cb: () => any,
    cronExpression: string,
  ): Promise<string> {
    const queryRunner =
      this.lockRepository.manager.connection.createQueryRunner();
    const cronIterator = parseExpression(cronExpression, {
      tz: 'Asia/Seoul',
    });

    await queryRunner.connect();
    await queryRunner.startTransaction();
    let lock: Lock;

    try {
      lock = await queryRunner.manager.findOne(Lock, {
        lock: { mode: 'pessimistic_write' },
        where: {
          name: key,
          executionableAt: LessThanOrEqual(new Date()),
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (!lock || lock.status !== 'idle') {
        console.log('No lock available');
        return 'Failed to lock the resource';
      }
      console.log('Lock acquired');

      const result = await cb();

      lock.status = 'success';
      lock.returnedData = JSON.stringify(result);

      await queryRunner.manager.save(lock);
    } catch (err) {
      console.error(err);
      if (lock) {
        lock.status = 'fail';
        lock.errorMessages = err.toString();

        await queryRunner.manager.save(lock);
      }
    } finally {
      const nextLock = new Lock();
      nextLock.name = key;
      nextLock.status = 'idle';
      nextLock.executionableAt = cronIterator.next().toDate();

      // commit 후 release하기 위해 무조건 catch되어야 한다.
      // TODO nextLock이 삽입되지 않는 것은 critical이다. 알림체계가 있어야 한다.
      await queryRunner.manager.save(nextLock).catch(console.error);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    }
  }
}
