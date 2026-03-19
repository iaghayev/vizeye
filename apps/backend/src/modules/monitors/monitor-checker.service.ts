import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as http  from 'http';
import * as https from 'https';
import * as net   from 'net';
import * as dns   from 'dns';
import { exec }   from 'child_process';
import { promisify } from 'util';
import { runSnmpCheck } from './checkers/snmp-monitor.checker';

const execAsync = promisify(exec);

export interface CheckResult {
  status:        'up' | 'down' | 'degraded' | 'timeout';
  responseTimeMs:number | null;
  error?:        string;
  metadata?:     any;
}

@Injectable()
export class MonitorCheckerService {
  private readonly logger = new Logger(MonitorCheckerService.name);
  private running = new Set<string>();

  constructor(private prisma: PrismaService) {}

  @Cron('*/30 * * * * *')
  async runDueChecks() {
    const now = new Date();
    const monitors = await this.prisma.monitor.findMany({
      where: {
        isActive: true,
        OR: [
          { lastCheckedAt: null },
          { lastCheckedAt: { lte: new Date(now.getTime() - 30000) } },
        ],
      },
      take: 50,
    });

    for (const monitor of monitors) {
      if (this.running.has(monitor.id)) continue;
      this.checkMonitor(monitor).catch(e =>
        this.logger.error(`Check failed ${monitor.id}: ${e.message}`)
      );
    }
  }

  async checkNow(monitorId: string): Promise<CheckResult> {
    const monitor = await this.prisma.monitor.findUnique({ where:{ id:monitorId } });
    if (!monitor) throw new Error('Monitor not found');
    return this.checkMonitor(monitor);
  }

  private async checkMonitor(monitor: any): Promise<CheckResult> {
    this.running.add(monitor.id);
    try {
      let result: CheckResult;
      const cfg     = (monitor.config as any) || {};
      const timeout = (monitor.timeoutSec || 10) * 1000;

      switch (monitor.monitorType) {
        case 'http':
        case 'https':  result = await this.checkHttp(monitor.target, timeout, cfg);     break;
        case 'tcp':    result = await this.checkTcp(monitor.target, timeout);           break;
        case 'ping':   result = await this.checkPing(monitor.target, timeout);          break;
        case 'ssl_expiry': result = await this.checkSsl(monitor.target, cfg);           break;
        case 'dns':    result = await this.checkDns(monitor.target, cfg);               break;
        case 'snmp':   result = await this.checkSnmp(monitor.target, cfg, timeout);     break;
        case 'agent':  result = await this.checkAgent(monitor.assetId);                 break;
        default:       result = { status:'down', responseTimeMs:null, error:`Unknown: ${monitor.monitorType}` };
      }

      // Monitor yenilə — yalnız mövcud sahələri yaz
      const updateData: any = {
        lastStatus:    result.status,
        lastCheckedAt: new Date(),
      };

      // Schema-da olan sahəni yoxla
      if ('lastResponseMs' in monitor) {
        updateData.lastResponseMs = result.responseTimeMs;
      }

      await this.prisma.monitor.update({
        where: { id: monitor.id },
        data:  updateData,
      });

      await this.prisma.checkResult.create({
        data: {
          monitorId:     monitor.id,
          orgId:         monitor.orgId,
          status:        result.status as any,
          responseTimeMs:result.responseTimeMs,
          checkedAt:     new Date(),
          metadata:      { error: result.error, ...result.metadata } as any,
        },
      });

      this.logger.debug(`${monitor.name}: ${result.status} (${result.responseTimeMs}ms)`);
      return result;
    } finally {
      this.running.delete(monitor.id);
    }
  }

  private checkHttp(url: string, timeoutMs: number, cfg: any): Promise<CheckResult> {
    return new Promise(resolve => {
      const start   = Date.now();
      const lib     = url.startsWith('https') ? https : http;
      const req = lib.get(url, {
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: { 'User-Agent': 'VizEye-Monitor/1.0' },
      } as any, (res) => {
        const ms       = Date.now() - start;
        const expected = cfg.expectedStatus || 200;
        const status   = res.statusCode === expected ? 'up' :
                         (res.statusCode || 0) < 500 ? 'degraded' : 'down';
        let body = '';
        res.on('data', (d) => { body += d; if (body.length > 2000) res.destroy(); });
        res.on('end',  () => {
          if (cfg.keyword && !body.includes(cfg.keyword)) {
            resolve({ status:'degraded', responseTimeMs:ms, error:'Keyword not found' });
          } else {
            const degraded = cfg.degradedThresholdMs && ms > cfg.degradedThresholdMs;
            resolve({ status: degraded ? 'degraded' : (status as any), responseTimeMs:ms,
                      metadata:{ httpStatus: res.statusCode } });
          }
        });
      });
      req.on('timeout', () => { req.destroy(); resolve({ status:'timeout', responseTimeMs:null }); });
      req.on('error',   (e) =>  resolve({ status:'down',    responseTimeMs:null, error:e.message }));
    });
  }

  private checkTcp(target: string, timeoutMs: number): Promise<CheckResult> {
    return new Promise(resolve => {
      const [host, portStr] = target.split(':');
      const port  = parseInt(portStr) || 80;
      const start = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);
      socket.connect(port, host, () => { socket.destroy(); resolve({ status:'up', responseTimeMs:Date.now()-start }); });
      socket.on('error',   (e) => { socket.destroy(); resolve({ status:'down',    responseTimeMs:null, error:e.message }); });
      socket.on('timeout', ()  => { socket.destroy(); resolve({ status:'timeout', responseTimeMs:null }); });
    });
  }

  private async checkPing(host: string, timeoutMs: number): Promise<CheckResult> {
    const start = Date.now();
    try {
      await execAsync(`ping -c 1 -W ${Math.ceil(timeoutMs/1000)} ${host}`);
      return { status:'up', responseTimeMs:Date.now()-start };
    } catch {
      return { status:'down', responseTimeMs:null, error:'Host unreachable' };
    }
  }

  private checkSsl(target: string, cfg: any): Promise<CheckResult> {
    return new Promise(resolve => {
      const [host, portStr] = target.split(':');
      const port  = parseInt(portStr) || 443;
      const start = Date.now();
      const tls   = require('tls');
      const socket = tls.connect({ host, port, rejectUnauthorized:false }, () => {
        const cert     = socket.getPeerCertificate();
        const expiry   = new Date(cert.valid_to);
        const daysLeft = Math.floor((expiry.getTime() - Date.now()) / 86400000);
        const warn     = cfg.warningDaysBeforeExpiry || 14;
        socket.destroy();
        resolve({
          status:        daysLeft <= 0 ? 'down' : daysLeft <= warn ? 'degraded' : 'up',
          responseTimeMs:Date.now()-start,
          metadata:      { daysLeft, expiry:expiry.toISOString(), subject:cert.subject?.CN },
        });
      });
      socket.on('error', (e: any) => resolve({ status:'down', responseTimeMs:null, error:e.message }));
      socket.setTimeout(10000, () => { socket.destroy(); resolve({ status:'timeout', responseTimeMs:null }); });
    });
  }

  private checkDns(host: string, cfg: any): Promise<CheckResult> {
    return new Promise(resolve => {
      const start = Date.now();
      dns.resolve(host, (cfg.recordType || 'A') as any, (err, addresses) => {
        const ms = Date.now() - start;
        if (err) resolve({ status:'down', responseTimeMs:ms, error:err.message });
        else     resolve({ status:'up',   responseTimeMs:ms, metadata:{ addresses } });
      });
    });
  }

  private async checkSnmp(target: string, cfg: any, timeoutMs: number): Promise<CheckResult> {
    const [host, portStr] = target.split(':');
    try {
      const result = await runSnmpCheck(host, {
        community: cfg.community || 'public',
        oid:       cfg.oid       || '1.3.6.1.2.1.1.1.0',
        port:      parseInt(portStr) || 161,
        timeoutMs,
      });
      return {
        status:        result.status === 'up' ? 'up' : result.status === 'timeout' ? 'timeout' : 'down',
        responseTimeMs:result.responseTimeMs,
        error:         result.error,
        metadata:      { snmpValue: result.value },
      };
    } catch(e: any) {
      return { status:'down', responseTimeMs:null, error:e.message };
    }
  }

  private async checkAgent(assetId: string): Promise<CheckResult> {
    if (!assetId) return { status:'down', responseTimeMs:null, error:'Asset not configured' };
    try {
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId }, select: { lastSeenAt: true },
      });
      if (!asset?.lastSeenAt) return { status:'down', responseTimeMs:null, error:'Agent never connected' };
      const ageMs = Date.now() - new Date(asset.lastSeenAt).getTime();
      if (ageMs > 120000) return { status:'down', responseTimeMs:null, error:`Offline ${Math.round(ageMs/1000)}s` };
      return { status:'up', responseTimeMs:ageMs };
    } catch(e: any) {
      return { status:'down', responseTimeMs:null, error:e.message };
    }
  }
}
