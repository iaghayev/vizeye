import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics') @ApiBearerAuth() @Controller('metrics')
export class MetricsController {

  constructor(private svc: MetricsService) {}

  // Son metrik dəyərləri
  @Get(':assetId/latest')
  async latest(
    @Param('assetId') assetId: string,
    @Query('names') names?: string,
  ) {
    const nameList = names ? names.split(',').map(n => n.trim()) : undefined;
    return this.svc.getLatest(assetId, nameList);
  }

  // Tarixçə metriklər
  @Get(':assetId/history')
  async history(
    @Param('assetId') assetId: string,
    @Query('minutes') minutes = '60',
    @Query('names') names?: string,
  ) {
    const nameList = names ? names.split(',').map(n => n.trim()) : undefined;
    return this.svc.getHistory(assetId, parseInt(minutes), nameList);
  }
}
