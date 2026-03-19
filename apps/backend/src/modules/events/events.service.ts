import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  // Check result-lardan up/down event log
  async findAll(q: any) {
    const limit  = Math.min(parseInt(q.limit  || '100'), 500);
    const offset = parseInt(q.offset || '0');
    const hours  = parseInt(q.hours  || '24');
    const since  = new Date(Date.now() - hours * 3600 * 1000);

    const where: any = { checkedAt: { gte: since } };
    if (q.assetId)    where.monitor = { assetId: q.assetId };
    if (q.status)     where.status  = q.status;
    if (q.monitorId)  where.monitorId = q.monitorId;

    const [results, total] = await Promise.all([
      this.prisma.checkResult.findMany({
        where,
        orderBy: { checkedAt: 'desc' },
        take:    limit,
        skip:    offset,
        include: {
          monitor: {
            select: {
              id: true, name: true, monitorType: true, target: true,
              asset: { select: { id: true, name: true, ipAddress: true } },
            },
          },
        },
      }),
      this.prisma.checkResult.count({ where }),
    ]);

    return {
      total, limit, offset,
      events: results.map(r => ({
        id:             r.id,
        status:         r.status,
        responseTimeMs: r.responseTimeMs,
        errorMessage: (r.metadata as any)?.error || null,
        checkedAt:      r.checkedAt,
        monitor: {
          id:          r.monitor.id,
          name:        r.monitor.name,
          type:        r.monitor.monitorType,
          target:      r.monitor.target,
        },
        asset: r.monitor.asset ? {
          id:        r.monitor.asset.id,
          name:      r.monitor.asset.name,
          ipAddress: r.monitor.asset.ipAddress,
        } : null,
      })),
    };
  }

  // Asset üçün monitor status tarixçəsi
  async assetHistory(assetId: string, q: any) {
    const hours = parseInt(q.hours || '24');
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const results = await this.prisma.checkResult.findMany({
      where: {
        checkedAt: { gte: since },
        monitor:   { assetId },
      },
      orderBy: { checkedAt: 'desc' },
      take: 500,
      include: {
        monitor: { select: { name: true, monitorType: true, target: true } },
      },
    });

    // Up/Down keçidlərini tap
    const transitions: any[] = [];
    let prevStatus: string | null = null;

    for (const r of [...results].reverse()) {
      if (r.status !== prevStatus) {
        transitions.push({
          from:      prevStatus,
          to:        r.status,
          at:        r.checkedAt,
          monitor:   r.monitor.name,
          duration:  null,
        });
        prevStatus = r.status;
      }
    }

    // Duration hesabla
    for (let i = 0; i < transitions.length - 1; i++) {
      const ms = new Date(transitions[i+1].at).getTime() - new Date(transitions[i].at).getTime();
      transitions[i].durationMs = ms;
    }

    // Uptime faizi
    const upCount   = results.filter(r => r.status === 'up').length;
    const uptime    = results.length ? (upCount / results.length * 100).toFixed(2) : '100.00';

    return {
      assetId,
      hours,
      total:       results.length,
      uptime:      parseFloat(uptime),
      transitions: transitions.reverse(),
      recent:      results.slice(0, 100).map(r => ({
        status:         r.status,
        responseTimeMs: r.responseTimeMs,
        errorMessage: (r.metadata as any)?.error || null,
        checkedAt:      r.checkedAt,
        monitor:        r.monitor.name,
      })),
    };
  }

  // Fayl dəyişiklikləri — agent-dən gələn filewatch metriklər
  async fileChanges(q: any) {
    const hours = parseInt(q.hours || '24');
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const changes = await this.prisma.metric.findMany({
      where: {
        metricName: 'filewatch.changed',
        value:      { gt: 0 },
        time:       { gte: since },
      },
      orderBy: { time: 'desc' },
      take: 200,
      include: {
        asset: { select: { id: true, name: true, ipAddress: true } },
      },
    });

    return {
      total:   changes.length,
      hours,
      changes: changes.map(c => ({
        assetId:   c.assetId,
        assetName: (c as any).asset?.name || c.assetId,
        ip:        (c as any).asset?.ipAddress || '',
        value:     c.value,
        time:      c.time,
        tags:      c.tags,
      })),
    };
  }

  // Statistika — son 24 saat
  async stats(q: any) {
    const hours = parseInt(q.hours || '24');
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const [total, down, degraded, fileChanges, failedServices] = await Promise.all([
      this.prisma.checkResult.count({ where: { checkedAt: { gte: since } } }),
      this.prisma.checkResult.count({ where: { checkedAt: { gte: since }, status: 'down' } }),
      this.prisma.checkResult.count({ where: { checkedAt: { gte: since }, status: 'degraded' } }),
      this.prisma.metric.count({
        where: { metricName: 'filewatch.changed', value: { gt: 0 }, time: { gte: since } },
      }),
      this.prisma.metric.aggregate({
        where:  { metricName: 'systemd.failed_units', time: { gte: since } },
        _max:   { value: true },
      }),
    ]);

    return {
      hours,
      checks:         total,
      downEvents:     down,
      degradedEvents: degraded,
      uptime:         total ? ((total - down) / total * 100).toFixed(2) : '100.00',
      fileChanges,
      failedServices: failedServices._max.value || 0,
    };
  }
}
