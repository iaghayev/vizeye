import { Controller,Get,Query,Request } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
@ApiTags('audit') @ApiBearerAuth() @Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}
  @Get() @Roles('admin') findAll(@Request() r:any,@Query() q:any){ return this.svc.findAll(r.user.orgId,q); }
}
