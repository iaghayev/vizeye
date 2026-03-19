import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('events') @ApiBearerAuth() @Controller('events')
export class EventsController {
  constructor(private svc: EventsService) {}

  // Bütün org üçün event log
  @Get()
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  // Asset üçün up/down tarixçəsi
  @Get('asset/:assetId')
  assetHistory(@Param('assetId') assetId: string, @Query() q: any) {
    return this.svc.assetHistory(assetId, q);
  }

  // Fayl dəyişiklikləri
  @Get('file-changes')
  fileChanges(@Query() q: any) {
    return this.svc.fileChanges(q);
  }

  // Statistika
  @Get('stats')
  stats(@Query() q: any) {
    return this.svc.stats(q);
  }
}
