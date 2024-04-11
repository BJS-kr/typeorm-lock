import { DataSource } from 'typeorm';
import { Lock } from '../db/lock.entity';

export const lockProviders = [
  {
    provide: 'LOCK_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Lock),
    inject: ['DATA_SOURCE'],
  },
];
