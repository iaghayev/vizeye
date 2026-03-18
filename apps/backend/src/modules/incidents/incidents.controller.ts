import { Controller,Get,Post,Patch,Delete,Param,Body,Query,Request } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('incidents') @ApiBearerAuth() @Controller('incidents')
export class IncidentsController {
  constructor(private svc: IncidentsService) {}
  @Get()    list(@Request() r:any,@Query() q:any){ return this.svc.findAll(r.user.orgId,q); }
  @Get('stats') stats(@Request() r:any){ return this.svc.getStats(r.user.orgId); }
  @Get(':id') get(@Request() r:any,@Param('id') id:string){ return this.svc.findOne(r.user.orgId,id); }
  @Post()   @Roles('engineer') create(@Request() r:any,@Body() dto:any){ return this.svc.create(r.user.orgId,dto,r.user.id); }
  @Patch(':id') @Roles('engineer') update(@Request() r:any,@Param('id') id:string,@Body() dto:any){ return this.svc.update(r.user.orgId,id,dto,r.user.id); }
  @Post(':id/comments') @Roles('engineer') addComment(@Request() r:any,@Param('id') id:string,@Body() b:any){ return this.svc.addComment(r.user.orgId,id,b.content,r.user.id); }
  @Delete(':id/comments/:cid') @Roles('engineer') delComment(@Request() r:any,@Param('id') id:string,@Param('cid') cid:string){ return this.svc.deleteComment(r.user.orgId,id,cid,r.user.id,r.user.role); }
}
