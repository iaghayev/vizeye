import { Controller, Get, Post, Delete, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('api-keys') @ApiBearerAuth() @Controller('api-keys')
export class ApiKeysController {
  constructor(private svc: ApiKeysService) {}

  @Get()    findAll(@Request() r: any) { return this.svc.findAll(r.user.orgId); }
  @Post()   @Roles('admin') create(@Request() r: any, @Body() dto: any) {
    return this.svc.create(r.user.orgId, r.user.id, dto);
  }
  @Delete(':id') @Roles('admin') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
