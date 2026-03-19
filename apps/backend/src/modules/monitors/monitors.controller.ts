import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MonitorsService } from './monitors.service';
import { MonitorCheckerService } from './monitor-checker.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('monitors') @ApiBearerAuth() @Controller('monitors')
export class MonitorsController {
  constructor(
    private svc:     MonitorsService,
    private checker: MonitorCheckerService,
  ) {}

  @Get()    findAll(@Request() r:any, @Query() q:any) { return this.svc.findAll(r.user.orgId, q); }
  @Get(':id') findOne(@Request() r:any, @Param('id') id:string) { return this.svc.findOne(r.user.orgId, id); }

  @Post() @Roles('engineer')
  create(@Request() r:any, @Body() dto:any) { return this.svc.create(r.user.orgId, dto); }

  @Patch(':id') @Roles('engineer')
  update(@Request() r:any, @Param('id') id:string, @Body() dto:any) { return this.svc.update(r.user.orgId, id, dto); }

  @Delete(':id') @Roles('engineer')
  remove(@Request() r:any, @Param('id') id:string) { return this.svc.remove(r.user.orgId, id); }

  @Post(':id/check-now')
  checkNow(@Param('id') id:string) { return this.checker.checkNow(id); }

  @Get(':id/results')
  results(@Request() r:any, @Param('id') id:string, @Query() q:any) {
    return this.svc.getResults(r.user.orgId, id, q);
  }
}
