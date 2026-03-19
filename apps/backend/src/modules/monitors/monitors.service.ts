import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MonitorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, q: any = {}) {
    return this.prisma.monitor.findMany({
      where:   { orgId, ...(q.assetId && { assetId: q.assetId }) },
      orderBy: { createdAt: 'desc' },
      take:    parseInt(q.limit  || '100'),
      skip:    parseInt(q.offset || '0'),
      include: { asset: { select:{ id:true, name:true, ipAddress:true } } },
    });
  }

  async findOne(orgId: string, id: string) {
    return this.prisma.monitor.findFirst({
      where:   { id, orgId },
      include: { asset: { select:{ id:true, name:true, ipAddress:true } } },
    });
  }

  async create(orgId: string, dto: any) {
    const { assetId, ...data } = dto;
    return this.prisma.monitor.create({
      data: {
        ...data,
        orgId,
        ...(assetId && { assetId }),
      },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    return this.prisma.monitor.update({
      where: { id },
      data:  dto,
    });
  }

  async remove(orgId: string, id: string) {
    return this.prisma.monitor.delete({ where: { id } });
  }

  async getResults(orgId: string, monitorId: string, q: any = {}) {
    const limit = parseInt(q.limit || '100');
    const from  = q.hours
      ? new Date(Date.now() - parseInt(q.hours) * 3600000)
      : undefined;

    const results = await this.prisma.checkResult.findMany({
      where: {
        monitorId,
        orgId,
        ...(from && { checkedAt: { gte: from } }),
      },
      orderBy: { checkedAt: 'desc' },
      take:    limit,
    });

    // Uptime hesabla
    const total = results.length;
    const up    = results.filter(r => r.status === 'up').length;
    const avgMs = results
      .filter(r => r.responseTimeMs != null)
      .reduce((s, r) => s + (r.responseTimeMs || 0), 0) / (total || 1);

    return {
      uptime:     total ? Math.round((up / total) * 10000) / 100 : 100,
      avgMs:      Math.round(avgMs),
      total,
      results,
    };
  }
}
