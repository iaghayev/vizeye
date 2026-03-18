import { Controller,Get,Post,Patch,Delete,Param,Body,Query,Request } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('notifications') @ApiBearerAuth() @Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}
  @Get('channels')    list(@Request() r:any){ return this.svc.findAllChannels(r.user.orgId); }
  @Post('channels')   @Roles('admin') create(@Request() r:any,@Body() dto:any){ return this.svc.createChannel(r.user.orgId,dto); }
  @Patch('channels/:id') @Roles('admin') update(@Request() r:any,@Param('id') id:string,@Body() dto:any){ return this.svc.updateChannel(r.user.orgId,id,dto); }
  @Delete('channels/:id') @Roles('admin') remove(@Request() r:any,@Param('id') id:string){ return this.svc.deleteChannel(r.user.orgId,id); }
  @Post('channels/:id/test') @Roles('engineer') test(@Request() r:any,@Param('id') id:string){ return this.svc.testChannel(r.user.orgId,id); }
  @Get('logs') logs(@Request() r:any,@Query() q:any){ return this.svc.getLogs(r.user.orgId,q); }
}
