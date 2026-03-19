import { Controller, Post, Body, Request, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { DiscoveryService, DiscoveredHost } from './discovery.service';

@ApiTags('discovery') @ApiBearerAuth() @Controller('discovery')
export class DiscoveryController {
  constructor(private svc: DiscoveryService) {}

  // Şəbəkəni tara
  @Post('scan')
  @Roles('engineer')
  scan(
    @Request() r: any,
    @Body() body: { range: string; ports?: number[]; maxConcurrent?: number },
  ) {
    return this.svc.discoverNetwork(r.user.orgId, body);
  }

  // IP range-ni yoxla (neçə IP skanlanacaq)
  @Post('preview')
  @Roles('engineer')
  preview(@Body() body: { range: string }) {
    const ips = this.svc.parseRange(body.range);
    return { range: body.range, count: ips.length, first: ips[0], last: ips[ips.length - 1] };
  }

  // Kəşf edilmiş hostları asset kimi qeyd et
  @Post('import')
  @Roles('engineer')
  importHosts(@Request() r: any, @Body() body: { hosts: DiscoveredHost[] }) {
    return this.svc.importDiscovered(r.user.orgId, body.hosts);
  }
}
