import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Lock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'enum',
    enum: ['idle', 'fail', 'success'],
    default: 'idle',
  })
  status: 'idle' | 'fail' | 'success';

  @Column({
    type: 'int',
    default: 0,
  })
  retryCount: number;

  @Column({
    type: 'text',
    default: '',
  })
  returnedData: string;

  @Column({
    type: 'text',
    default: '',
  })
  errorMessages: string;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  executionableAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
