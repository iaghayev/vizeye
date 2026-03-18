import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    (this as any).$on('query', (e: any) => {
      if (e.duration > 500) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async softDelete(model: string, where: Record<string, any>) {
    return (this as any)[model].update({ where, data: { isActive: false } });
  }
}
