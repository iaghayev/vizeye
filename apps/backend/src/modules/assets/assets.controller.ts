import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('assets') @ApiBearerAuth() @Controller('assets')
export class AssetsController {
  constructor(private svc: AssetsService) {}
  @Get()    findAll(@Request() r:any,@Query() q:any){ return this.svc.findAll(r.user.orgId,q); }
  @Get(':id') findOne(@Request() r:any,@Param('id') id:string){ return this.svc.findOne(r.user.orgId,id); }
  @Post()   @Roles('engineer') create(@Request() r:any,@Body() dto:any){ return this.svc.create(r.user.orgId,dto); }
  @Patch(':id') @Roles('engineer') update(@Request() r:any,@Param('id') id:string,@Body() dto:any){ return this.svc.update(r.user.orgId,id,dto); }
  @Delete(':id') @Roles('engineer') remove(@Request() r:any,@Param('id') id:string){ return this.svc.remove(r.user.orgId,id); }
  @Post(':id/agent-token') @Roles('admin') agentToken(@Request() r:any,@Param('id') id:string){ return this.svc.generateAgentToken(r.user.orgId,id); }
}
