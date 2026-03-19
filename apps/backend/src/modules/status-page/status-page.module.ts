import { Module } from '@nestjs/common';
import { StatusPageService } from './status-page.service';
import { StatusPageController } from './status-page.controller';

@Module({
  providers:   [StatusPageService],
  controllers: [StatusPageController],
})
export class StatusPageModule {}
