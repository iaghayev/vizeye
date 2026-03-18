import { Controller,Get,Post,Patch,Delete,Param,Body,Request } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('dashboards') @ApiBearerAuth() @Controller('dashboards')
export class DashboardsController {
  constructor(private svc: DashboardsService) {}
  @Get()        list(@Request() r:any){ return this.svc.findAll(r.user.orgId); }
  @Get('default') def(@Request() r:any){ return this.svc.getDefault(r.user.orgId); }
  @Get(':id')   get(@Request() r:any,@Param('id') id:string){ return this.svc.findOne(r.user.orgId,id); }
  @Post()       @Roles('engineer') create(@Request() r:any,@Body() dto:any){ return this.svc.create(r.user.orgId,dto,r.user.id); }
  @Patch(':id') @Roles('engineer') update(@Request() r:any,@Param('id') id:string,@Body() dto:any){ return this.svc.update(r.user.orgId,id,dto); }
  @Delete(':id') @Roles('engineer') remove(@Request() r:any,@Param('id') id:string){ return this.svc.remove(r.user.orgId,id); }
  @Post(':id/widgets') @Roles('engineer') addW(@Request() r:any,@Param('id') id:string,@Body() dto:any){ return this.svc.addWidget(r.user.orgId,id,dto); }
  @Patch(':id/widgets/:wid') @Roles('engineer') updateW(@Request() r:any,@Param('id') id:string,@Param('wid') wid:string,@Body() dto:any){ return this.svc.updateWidget(r.user.orgId,id,wid,dto); }
  @Delete(':id/widgets/:wid') @Roles('engineer') removeW(@Request() r:any,@Param('id') id:string,@Param('wid') wid:string){ return this.svc.removeWidget(r.user.orgId,id,wid); }
}
