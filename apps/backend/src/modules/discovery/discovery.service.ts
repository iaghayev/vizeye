import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const dnsReverse = promisify(dns.reverse);

export interface DiscoveredHost {
  ipAddress: string;
  hostname?: string;
  openPorts: number[];
  responseTimeMs: number | null;
  suggestedType: string;
  isNew: boolean;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private prisma: PrismaService) {}

  // IP range-ni parse et: "192.168.1.1-254" → string[]
  parseRange(range: string): string[] {
    const ips: string[] = [];

    // CIDR: 192.168.1.0/24
    if (range.includes('/')) {
      const [base, bits] = range.split('/');
      const mask = parseInt(bits);
      const [a,b,c,d] = base.split('.').map(Number);
      const baseNum = (a<<24)|(b<<16)|(c<<8)|d;
      const count = Math.pow(2, 32 - mask);
      for (let i = 1; i < count - 1; i++) {
        const n = baseNum + i;
        ips.push(`${(n>>24)&255}.${(n>>16)&255}.${(n>>8)&255}.${n&255}`);
      }
      return ips;
    }

    // Range: 192.168.1.1-254
    if (range.includes('-')) {
      const parts = range.split('.');
      const lastPart = parts[3];
      if (lastPart?.includes('-')) {
        const [start, end] = lastPart.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`);
        }
        return ips;
      }
    }

    // Single IP
    ips.push(range.trim());
    return ips;
  }

  // Bir porta TCP bağlantı yoxla
  private checkPort(ip: string, port: number, timeoutMs = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);
      socket.connect(port, ip, () => { socket.destroy(); resolve(true); });
      socket.on('error',   () => { socket.destroy(); resolve(false); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });
  }

  // Ping yoxla
  private async pingHost(ip: string): Promise<number | null> {
    try {
      const cmd = process.platform === 'win32'
        ? `ping -n 1 -w 1000 ${ip}`
        : `ping -c 1 -W 1 ${ip}`;
      const start = Date.now();
      await execAsync(cmd);
      return Date.now() - start;
    } catch {
      return null;
    }
  }

  // Cihaz tipini açıq portlara görə təxmin et
  private suggestType(ports: number[]): string {
    if (ports.includes(5432) || ports.includes(3306) || ports.includes(1521)) return 'server';
    if (ports.includes(80) || ports.includes(443) || ports.includes(8080)) return 'website';
    if (ports.includes(22) || ports.includes(3389)) return 'server';
    if (ports.includes(161)) return 'network_device';
    if (ports.includes(2376) || ports.includes(2377)) return 'container';
    return 'other';
  }

  // Hostname-i IP-dən tap
  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const hostnames = await dnsReverse(ip);
      return hostnames[0];
    } catch {
      return undefined;
    }
  }

  // Bir IP-ni skan et
  async scanHost(ip: string, ports: number[]): Promise<DiscoveredHost | null> {
    const pingMs = await this.pingHost(ip);
    if (pingMs === null) return null;

    const portChecks = await Promise.all(ports.map(p => this.checkPort(ip, p)));
    const openPorts  = ports.filter((_, i) => portChecks[i]);
    const hostname   = await this.resolveHostname(ip);

    return {
      ipAddress: ip,
      hostname,
      openPorts,
      responseTimeMs: pingMs,
      suggestedType: this.suggestType(openPorts),
      isNew: true,
    };
  }

  // Tam şəbəkə skanı
  async discoverNetwork(orgId: string, dto: {
    range: string;
    ports?: number[];
    maxConcurrent?: number;
  }) {
    const ips  = this.parseRange(dto.range);
    const ports = dto.ports || [22, 80, 443, 3306, 5432, 8080, 161, 3389, 6379, 27017];
    const concurrency = Math.min(dto.maxConcurrent || 20, 50);

    this.logger.log(`Starting discovery: ${ips.length} IPs, ports: ${ports.join(',')}`);

    // Mövcud assetləri al — yeni/köhnə fərqləndirmək üçün
    const existing = await this.prisma.asset.findMany({
      where: { orgId, isActive: true },
      select: { ipAddress: true },
    });
    const existingIps = new Set(existing.map(a => a.ipAddress).filter(Boolean));

    const discovered: DiscoveredHost[] = [];
    const errors: string[] = [];

    // Paralel skan — concurrency limiti ilə
    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(ip => this.scanHost(ip, ports))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const host = result.value;
          host.isNew = !existingIps.has(host.ipAddress);
          discovered.push(host);
        }
      }

      this.logger.log(`Progress: ${Math.min(i + concurrency, ips.length)}/${ips.length}`);
    }

    return {
      scanned:    ips.length,
      found:      discovered.length,
      newHosts:   discovered.filter(h => h.isNew).length,
      hosts:      discovered.sort((a,b) => {
        const [,,,da] = a.ipAddress.split('.').map(Number);
        const [,,,db] = b.ipAddress.split('.').map(Number);
        return da - db;
      }),
    };
  }

  // Kəşf edilmiş hostları asset kimi qeyd et
  async importDiscovered(orgId: string, hosts: DiscoveredHost[]) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const host of hosts) {
      try {
        const existing = await this.prisma.asset.findFirst({
          where: { orgId, ipAddress: host.ipAddress },
        });

        if (existing) { results.skipped++; continue; }

        await this.prisma.asset.create({
          data: {
            orgId,
            name:        host.hostname || host.ipAddress,
            assetType:   host.suggestedType as any,
            ipAddress:   host.ipAddress,
            hostname:    host.hostname || null,
            environment: 'production',
            criticality: 'medium',
            isActive:    true,
            metadata:    { discoveredPorts: host.openPorts, discoveryMs: host.responseTimeMs },
            tags:        ['auto-discovered'],
          },
        });
        results.created++;
      } catch(e: any) {
        results.errors.push(`${host.ipAddress}: ${e.message}`);
        results.skipped++;
      }
    }

    return results;
  }
}
