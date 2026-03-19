import { Controller, Post, Body, Get, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { checkSnmpUdp, checkSnmpTcp } from './checkers/snmp.checker';
import { PrismaService } from '../../prisma/prisma.service';

interface SnmpOidConfig {
  host:         string;
  community?:   string;
  oid?:         string;
  version?:     string;
  timeoutMs?:   number;
}

@ApiTags('snmp') @ApiBearerAuth() @Controller('snmp')
export class SnmpController {
  constructor(private prisma: PrismaService) {}

  // Əlçatanlıq testi
  @Post('test')
  @Roles('engineer')
  async test(@Body() body: SnmpOidConfig) {
    const result = await checkSnmpUdp(
      body.host,
      body.community || 'public',
      body.oid || '1.3.6.1.2.1.1.1.0',
      body.timeoutMs || 5000,
    );
    return result;
  }

  // Cihaz məlumatları — bir neçə OID
  @Post('device-info')
  @Roles('engineer')
  async deviceInfo(@Body() body: { host: string; community?: string }) {
    const comm = body.community || 'public';
    const oids: Record<string, string> = {
      sysDescr:    '1.3.6.1.2.1.1.1.0',
      sysName:     '1.3.6.1.2.1.1.5.0',
      sysLocation: '1.3.6.1.2.1.1.6.0',
      sysContact:  '1.3.6.1.2.1.1.4.0',
    };

    const results: Record<string, any> = {};
    await Promise.all(
      Object.entries(oids).map(async ([key, oid]) => {
        const r = await checkSnmpUdp(body.host, comm, oid, 3000);
        results[key] = r.status === 'up' ? r.value : null;
      })
    );

    return { host: body.host, reachable: Object.values(results).some(Boolean), info: results };
  }

  // SNMP port yoxla (UDP 161)
  @Post('ping')
  @Roles('engineer')
  async ping(@Body() body: { host: string }) {
    return checkSnmpTcp(body.host, 3000);
  }

  // Standart OID kataloqu
  @Get('oids')
  getOids() {
    return {
      system: [
        { oid:'1.3.6.1.2.1.1.1.0', name:'sysDescr',    desc:'Sistem təsviri' },
        { oid:'1.3.6.1.2.1.1.3.0', name:'sysUpTime',   desc:'Uptime (timeticks)' },
        { oid:'1.3.6.1.2.1.1.4.0', name:'sysContact',  desc:'Əlaqə məlumatı' },
        { oid:'1.3.6.1.2.1.1.5.0', name:'sysName',     desc:'Sistem adı' },
        { oid:'1.3.6.1.2.1.1.6.0', name:'sysLocation', desc:'Fiziki yer' },
      ],
      interfaces: [
        { oid:'1.3.6.1.2.1.2.1.0',   name:'ifNumber',    desc:'İnterfeys sayı' },
        { oid:'1.3.6.1.2.1.31.1.1.1.1', name:'ifName',   desc:'İnterfeys adı' },
      ],
      cisco: [
        { oid:'1.3.6.1.4.1.9.2.1.57.0', name:'avgBusy1',  desc:'CPU Load 1m %' },
        { oid:'1.3.6.1.4.1.9.2.1.58.0', name:'avgBusy5',  desc:'CPU Load 5m %' },
      ],
      hp: [
        { oid:'1.3.6.1.4.1.11.2.14.11.1.2.6.1.4.1', name:'cpuUtil', desc:'HP CPU %' },
      ],
      windows: [
        { oid:'1.3.6.1.2.1.25.3.3.1.2.0', name:'hrProcessorLoad', desc:'CPU Load %' },
        { oid:'1.3.6.1.2.1.25.2.3.1.6.1', name:'hrStorageUsed',   desc:'Disk İstifadəsi' },
      ],
    };
  }
}
