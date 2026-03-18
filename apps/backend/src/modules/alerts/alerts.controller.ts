import { Controller,Get,Post,Patch,Delete,Param,Body,Query,Request } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('alerts') @ApiBearerAuth() @Controller('alerts')
export class AlertsController {
  constructor(private svc: AlertsService) {}
  @Get('rules')      rules(@Request() r:any){ return this.svc.findAllRules(r.user.orgId); }
  @Post('rules')     @Roles('engineer') createRule(@Request() r:any,@Body() dto:any){ return this.svc.createRule(r.user.orgId,dto); }
  @Patch('rules/:id') @Roles('engineer') updateRule(@Request() r:any,@Param('id') id:string,@Body() dto:any){ return this.svc.updateRule(r.user.orgId,id,dto); }
  @Delete('rules/:id') @Roles('engineer') deleteRule(@Request() r:any,@Param('id') id:string){ return this.svc.deleteRule(r.user.orgId,id); }
  @Patch('rules/:id/toggle') @Roles('engineer') toggleRule(@Request() r:any,@Param('id') id:string){ return this.svc.toggleRule(r.user.orgId,id); }
  @Get('events/summary') summary(@Request() r:any){ return this.svc.getAlertSummary(r.user.orgId); }
  @Get('events')     events(@Request() r:any,@Query() q:any){ return this.svc.findAllEvents(r.user.orgId,q); }
  @Get('events/:id') event(@Request() r:any,@Param('id') id:string){ return this.svc.findOneEvent(r.user.orgId,id); }
  @Patch('events/:id/resolve') @Roles('engineer') resolve(@Request() r:any,@Param('id') id:string){ return this.svc.resolveEvent(r.user.orgId,id); }
}
