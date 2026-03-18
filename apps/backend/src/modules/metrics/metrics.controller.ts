import { Controller,Get,Post,Param,Body,Query,Request,UseGuards } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { AgentKeyGuard } from '../../common/guards/agent-key.guard';
import { Public } from '../../common/decorators/public.decorator';
@ApiTags('metrics') @Controller('metrics')
export class MetricsController {
  constructor(private svc: MetricsService) {}
  @Public() @UseGuards(AgentKeyGuard) @Post('../../ingest/metrics')
  ingest(@Request() r:any,@Body() body:any){ return this.svc.ingest(r.asset,body.metrics||[]); }
  @Public() @UseGuards(AgentKeyGuard) @Post('../../ingest/heartbeat')
  heartbeat(@Request() r:any){ return this.svc.heartbeat(r.asset); }
  @ApiBearerAuth() @Get(':assetId') query(@Param('assetId') id:string,@Query() q:any){ return this.svc.query(id,q); }
  @ApiBearerAuth() @Get(':assetId/latest') latest(@Param('assetId') id:string){ return this.svc.getLatest(id); }
}
