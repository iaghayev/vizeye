import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.maintenanceWindow.findMany({
      where:   { orgId },
      orderBy: { startTime: 'desc' },
      include: { monitors: { select: { id: true, name: true } } },
    });
  }

  async getActive(orgId: string) {
    const now = new Date();
    return this.prisma.maintenanceWindow.findMany({
      where: {
        orgId,
        startTime: { lte: now },
        endTime:   { gte: now },
      },
      include: { monitors: { select: { id: true, name: true } } },
    });
  }

  async create(orgId: string, dto: any) {
    const { monitorIds, ...data } = dto;
    return this.prisma.maintenanceWindow.create({
      data: {
        ...data,
        orgId,
        startTime: new Date(dto.startTime),
        endTime:   new Date(dto.endTime),
        monitors: monitorIds?.length
          ? { connect: monitorIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: { monitors: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: any) {
    const { monitorIds, ...data } = dto;
    return this.prisma.maintenanceWindow.update({
      where: { id },
      data:  {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime:   data.endTime   ? new Date(data.endTime)   : undefined,
        monitors:  monitorIds
          ? { set: monitorIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: { monitors: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    return this.prisma.maintenanceWindow.delete({ where: { id } });
  }

  async isMonitorInMaintenance(monitorId: string): Promise<boolean> {
    const now = new Date();
    const count = await this.prisma.maintenanceWindow.count({
      where: {
        startTime: { lte: now },
        endTime:   { gte: now },
        monitors:  { some: { id: monitorId } },
      },
    });
    return count > 0;
  }
}
