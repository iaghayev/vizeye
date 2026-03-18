import { Controller,Get,Patch,Body,Request } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
@ApiTags('settings') @ApiBearerAuth() @Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}
  @Get()    get(@Request() r:any){ return this.svc.getSettings(r.user.orgId); }
  @Patch()  update(@Request() r:any,@Body() dto:any){ return this.svc.updateSettings(r.user.orgId,dto); }
}
