import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private prismaHealth: PrismaHealthIndicator, private prisma: PrismaService) {}
  @Public() @Get() @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
