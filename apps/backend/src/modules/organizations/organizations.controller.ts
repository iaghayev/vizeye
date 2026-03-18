import { Controller, Get, Patch, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
@ApiTags('org') @ApiBearerAuth() @Controller('org')
export class OrganizationsController {
  constructor(private svc: OrganizationsService) {}
  @Get()        get(@Request() r:any){ return this.svc.findOne(r.user.orgId); }
  @Get('stats') stats(@Request() r:any){ return this.svc.getStats(r.user.orgId); }
  @Patch()      update(@Request() r:any,@Body() dto:any){ return this.svc.update(r.user.orgId,dto); }
}
