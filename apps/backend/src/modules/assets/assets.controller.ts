import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { AssetsImportService } from './assets-import.service';
import { AssetsPingService } from './assets-ping.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('assets') @ApiBearerAuth() @Controller('assets')
export class AssetsController {
  constructor(
    private svc:      AssetsService,
    private importSvc:AssetsImportService,
    private pingSvc:  AssetsPingService,
  ) {}

  @Get()    findAll(@Request() r:any, @Query() q:any)  { return this.svc.findAll(r.user.orgId, q); }
  @Get('import/template') template()                    { return this.importSvc.getCsvTemplate(); }
  @Get(':id') findOne(@Request() r:any, @Param('id') id:string) { return this.svc.findOne(r.user.orgId, id); }

  @Post()
  @Roles('engineer')
  create(@Request() r:any, @Body() dto:any) {
    return this.svc.create(r.user.orgId, dto);
  }

  @Patch(':id') @Roles('engineer')
  update(@Request() r:any, @Param('id') id:string, @Body() dto:any) {
    return this.svc.update(r.user.orgId, id, dto);
  }

  @Delete(':id') @Roles('engineer')
  remove(@Request() r:any, @Param('id') id:string) {
    return this.svc.remove(r.user.orgId, id);
  }

  @Post(':id/agent-token') @Roles('admin')
  agentToken(@Request() r:any, @Param('id') id:string) {
    return this.svc.generateAgentToken(r.user.orgId, id);
  }

  // ── Connectivity check ───────────────────────────────────────────────────
  @Post('check-connectivity')
  @Roles('engineer')
  async checkConnectivity(@Body() body: { ip: string; timeout?: number }) {
    if (!body.ip) return { error: 'IP ünvanı tələb olunur' };
    return this.pingSvc.checkConnectivity(body.ip, body.timeout || 3000);
  }

  // ── CSV Import ───────────────────────────────────────────────────────────
  @Post('import/csv')
  @Roles('engineer')
  importCsv(@Request() r:any, @Body() body:{csv:string}) {
    return this.importSvc.importFromCsv(r.user.orgId, body.csv);
  }

  @Post('import/validate')
  @Roles('engineer')
  validateCsv(@Body() body:{csv:string}) {
    try {
      const rows = this.importSvc.parseCsv(body.csv);
      return { valid: true, rowCount: rows.length, preview: rows.slice(0,3) };
    } catch(e:any) {
      return { valid: false, error: e.message };
    }
  }
}
