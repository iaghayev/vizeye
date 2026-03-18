import { Module } from '@nestjs/common';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';
@Module({ providers:[MonitorsService], controllers:[MonitorsController], exports:[MonitorsService] })
export class MonitorsModule {}
