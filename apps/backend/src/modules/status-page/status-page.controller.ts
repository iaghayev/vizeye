import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StatusPageService } from './status-page.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('status') @Controller('status')
export class StatusPageController {
  constructor(private svc: StatusPageService) {}

  @Public()
  @Get(':slug')
  getStatus(@Param('slug') slug: string) {
    return this.svc.getPublicStatus(slug);
  }
}
