import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AgentKeyGuard } from '../../common/guards/agent-key.guard';
import { MetricsService } from '../metrics/metrics.service';
import { AssetsService } from '../assets/assets.service';

@ApiTags('ingest')
@Controller('ingest')
export class IngestController {
  constructor(
    private metricsService: MetricsService,
    private assetsService: AssetsService,
  ) {}

  @Public()
  @UseGuards(AgentKeyGuard)
  @Post('metrics')
  ingest(@Request() req: any, @Body() body: any) {
    return this.metricsService.ingest(req.asset, body.metrics || []);
  }

  @Public()
  @UseGuards(AgentKeyGuard)
  @Post('heartbeat')
  heartbeat(@Request() req: any) {
    return this.metricsService.heartbeat(req.asset);
  }
}
