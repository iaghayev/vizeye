import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  // ── Ingest — agent-dən metrik qəbul et ────────────────────────────────────
  async ingest(asset: any, metrics: { name: string; value: number; timestamp?: string; tags?: any }[]) {
    if (!metrics?.length) return { accepted: 0 };

    await this.prisma.metric.createMany({
      data: metrics.map(m => ({
        orgId:      asset.orgId,
        assetId:    asset.id,
        metricName: m.name,
        value:      m.value,
        time:       m.timestamp ? new Date(m.timestamp) : new Date(),
        tags:       m.tags || {},
      })),
      skipDuplicates: true,
    });

    // Asset lastSeenAt yenilə
    await this.prisma.asset.update({
      where: { id: asset.id },
      data:  { lastSeenAt: new Date() },
    });

    return { accepted: metrics.length };
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  async heartbeat(asset: any) {
    await this.prisma.asset.update({
      where: { id: asset.id },
      data:  { lastSeenAt: new Date() },
    });
    return { ok: true, assetId: asset.id, time: new Date() };
  }

  // ── Son metrik dəyərləri ──────────────────────────────────────────────────
  async getLatest(assetId: string, names?: string[]) {
    const where: any = { assetId };
    if (names?.length) where.metricName = { in: names };

    // Mövcud metrik adlarını tap
    const distinctNames = await this.prisma.metric.findMany({
      where,
      select:   { metricName: true },
      distinct: ['metricName'],
    }).then(r => r.map(m => m.metricName));

    // Hər ad üçün ən son dəyəri al
    const metrics = await Promise.all(
      distinctNames.map(async metricName => {
        const m = await this.prisma.metric.findFirst({
          where:   { assetId, metricName },
          orderBy: { time: 'desc' },
        });
        return m
          ? { name: m.metricName, value: m.value, timestamp: m.time }
          : null;
      })
    );

    return {
      assetId,
      metrics:   metrics.filter(Boolean),
      updatedAt: new Date(),
    };
  }

  // ── Tarixçə metriklər ─────────────────────────────────────────────────────
  async getHistory(assetId: string, minutes = 60, names?: string[]) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const where: any = { assetId, time: { gte: since } };
    if (names?.length) where.metricName = { in: names };

    const rows = await this.prisma.metric.findMany({
      where,
      orderBy: { time: 'asc' },
      select:  { metricName: true, value: true, time: true },
    });

    // Series formatına çevir
    const seriesMap: Record<string, { time: Date; value: number }[]> = {};
    for (const row of rows) {
      if (!seriesMap[row.metricName]) seriesMap[row.metricName] = [];
      seriesMap[row.metricName].push({ time: row.time, value: row.value });
    }

    return {
      assetId,
      minutes,
      series: Object.entries(seriesMap).map(([name, points]) => ({ name, points })),
    };
  }
}
