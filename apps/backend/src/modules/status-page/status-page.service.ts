import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatusPageService {
  constructor(private prisma: PrismaService) {}

  async getPublicStatus(slug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { slug },
    });

    if (!org) throw new NotFoundException('Status page not found');

    const monitors = await this.prisma.monitor.findMany({
      where:  { orgId: org.id, isActive: true },
      select: {
        id: true, name: true, monitorType: true,
        target: true, lastStatus: true,
        checkResults: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
          select: { status: true, checkedAt: true, responseTimeMs: true },
        },
      },
    });

    const incidents = await this.prisma.incident.findMany({
      where:   { orgId: org.id, status: { in: ['open','acknowledged','in_progress'] } },
      select:  { id: true, title: true, description: true, severity: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const statuses = monitors.map(m => m.lastStatus || 'unknown');
    const overallStatus =
      statuses.includes('down')       ? 'outage'      :
      statuses.includes('degraded')   ? 'degraded'    :
      statuses.every(s => s === 'up') ? 'operational' : 'unknown';

    const components = monitors.map(m => ({
      name:           m.name,
      status:         m.lastStatus === 'up'       ? 'operational' :
                      m.lastStatus === 'down'     ? 'outage'      :
                      m.lastStatus === 'degraded' ? 'degraded'    : 'unknown',
      responseTimeMs: m.checkResults[0]?.responseTimeMs ?? null,
      type:           m.monitorType,
    }));

    const uptimeHistory = await Promise.all(
      monitors.slice(0, 5).map(async m => {
        const days = await this.get90DayUptime(m.id);
        const avg  = days.length
          ? days.reduce((s, d) => s + d.uptime, 0) / days.length
          : 100;
        return { name: m.name, uptimePercent: avg, days };
      })
    );

    return {
      orgName:         org.name,
      slug:            org.slug,
      overallStatus,
      components,
      uptimeHistory,
      activeIncidents: incidents,
      generatedAt:     new Date(),
    };
  }

  private async get90DayUptime(monitorId: string) {
    const days: { date: string; uptime: number }[] = [];
    const now = new Date();

    for (let i = 89; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const [total, up] = await Promise.all([
        this.prisma.checkResult.count({
          where: { monitorId, checkedAt: { gte: start, lte: end } },
        }),
        this.prisma.checkResult.count({
          where: { monitorId, checkedAt: { gte: start, lte: end }, status: 'up' },
        }),
      ]);

      days.push({
        date:   start.toLocaleDateString('en', { month:'short', day:'numeric' }),
        uptime: total > 0 ? (up / total) * 100 : 100,
      });
    }
    return days;
  }
}
