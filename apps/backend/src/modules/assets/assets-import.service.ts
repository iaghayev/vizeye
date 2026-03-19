import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetType, Environment, Criticality } from '@prisma/client';

@Injectable()
export class AssetsImportService {
  constructor(private prisma: PrismaService) {}

  // Parse CSV string → rows
  parseCsv(csv: string): Record<string, string>[] {
    const lines = csv.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have header + at least 1 row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.splitCsvLine(lines[i]);
      if (values.length === 0) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
      rows.push(row);
    }

    return rows;
  }

  // Handle quoted CSV values
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result;
  }

  // Normalize enum values
  private normalizeType(v: string): AssetType {
    const map: Record<string, AssetType> = {
      server: 'server', vm: 'vm', virtual: 'vm', 'virtual machine': 'vm',
      network: 'network_device', switch: 'network_device', router: 'network_device',
      container: 'container', docker: 'container', website: 'website', web: 'website',
      service: 'service', other: 'other',
    };
    return map[v?.toLowerCase()] || 'server';
  }

  private normalizeEnv(v: string): Environment {
    const map: Record<string, Environment> = {
      prod: 'production', production: 'production',
      stag: 'staging', staging: 'staging',
      dev: 'development', development: 'development',
      test: 'test',
    };
    return map[v?.toLowerCase()] || 'production';
  }

  private normalizeCrit(v: string): Criticality {
    const map: Record<string, Criticality> = {
      critical: 'critical', crit: 'critical',
      high: 'high', hi: 'high',
      medium: 'medium', med: 'medium', normal: 'medium',
      low: 'low',
    };
    return map[v?.toLowerCase()] || 'medium';
  }

  async importFromCsv(orgId: string, csvString: string) {
    const rows = this.parseCsv(csvString);
    const results = { success: 0, failed: 0, errors: [] as string[], created: [] as any[] };

    for (const row of rows) {
      const name = row.name || row.hostname || row.ip_address || row.ip;
      if (!name) { results.failed++; results.errors.push('Row missing name field'); continue; }

      try {
        const asset = await this.prisma.asset.create({
          data: {
            orgId,
            name: name.trim(),
            assetType: this.normalizeType(row.asset_type || row.type || ''),
            hostname:   row.hostname   || null,
            ipAddress:  row.ip_address || row.ip || null,
            osName:     row.os_name    || row.os  || null,
            osVersion:  row.os_version || null,
            environment: this.normalizeEnv(row.environment || row.env || 'production'),
            criticality: this.normalizeCrit(row.criticality || row.priority || 'medium'),
            location:    row.location  || null,
            description: row.description || row.desc || null,
            tags:        row.tags ? row.tags.split(';').map(t => t.trim()).filter(Boolean) : [],
            metadata:    {},
            isActive:    true,
          },
        });
        results.success++;
        results.created.push({ id: asset.id, name: asset.name });
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Row "${name}": ${e.message}`);
      }
    }

    return results;
  }

  // Generate sample CSV template
  getCsvTemplate(): string {
    const header = 'name,asset_type,hostname,ip_address,os_name,os_version,environment,criticality,location,description,tags';
    const examples = [
      'web-server-01,server,web01.company.com,192.168.1.10,Ubuntu,22.04 LTS,production,critical,us-east-1,Primary web server,web;nginx',
      'db-primary,server,db01.company.com,192.168.1.20,Ubuntu,22.04 LTS,production,critical,us-east-1,PostgreSQL primary,database;postgresql',
      'staging-vm,vm,staging.company.com,192.168.2.10,Debian,12,staging,medium,us-west-2,Staging environment,staging',
      'core-switch,network_device,,192.168.0.1,Cisco IOS,15.6,production,high,datacenter,Core network switch,network;cisco',
    ];
    return [header, ...examples].join('\n');
  }
}
