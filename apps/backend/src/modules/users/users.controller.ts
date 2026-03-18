import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}
  @Get()    findAll(@Request() r:any,@Query('q') q:string) { return this.svc.findAll(r.user.orgId,q); }
  @Get(':id') findOne(@Request() r:any,@Param('id') id:string) { return this.svc.findOne(r.user.orgId,id); }
  @Post()   @Roles('admin') create(@Request() r:any,@Body() dto:any) { return this.svc.create(r.user.orgId,dto,r.user.role); }
  @Patch(':id') update(@Request() r:any,@Param('id') id:string,@Body() dto:any) { return this.svc.update(r.user.orgId,id,dto,r.user.id,r.user.role); }
  @Delete(':id') @Roles('admin') remove(@Request() r:any,@Param('id') id:string) { return this.svc.remove(r.user.orgId,id,r.user.id); }
}
