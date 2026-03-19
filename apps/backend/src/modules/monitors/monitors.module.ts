import { Module } from '@nestjs/common';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';
import { MonitorCheckerService } from './monitor-checker.service';

@Module({
  providers:   [MonitorsService, MonitorCheckerService],
  controllers: [MonitorsController],
  exports:     [MonitorsService, MonitorCheckerService],
})
export class MonitorsModule {}
