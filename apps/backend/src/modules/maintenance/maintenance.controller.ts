import { Controller, Get, Post, Patch, Delete, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('maintenance') @ApiBearerAuth() @Controller('maintenance')
export class MaintenanceController {
  constructor(private svc: MaintenanceService) {}

  @Get()    findAll(@Request() r: any) { return this.svc.findAll(r.user.orgId); }
  @Get('active') active(@Request() r: any) { return this.svc.getActive(r.user.orgId); }
  @Post()   @Roles('engineer') create(@Request() r: any, @Body() dto: any) { return this.svc.create(r.user.orgId, dto); }
  @Patch(':id') @Roles('engineer') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('engineer') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
