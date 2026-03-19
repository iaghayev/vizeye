import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where:   { orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, keyPrefix: true,
        permissions: true, lastUsedAt: true,
        expiresAt: true, createdAt: true,
      },
    });
    return keys;
  }

  async create(orgId: string, userId: string, dto: { name: string; permissions?: any; expiresAt?: string }) {
    const raw    = `vizeye_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = raw.substring(0, 16) + '...';
    const hash   = crypto.createHash('sha256').update(raw).digest('hex');

    await this.prisma.apiKey.create({
      data: {
        orgId,
        name:        dto.name,
        keyHash:     hash,
        keyPrefix:   prefix,
        permissions: dto.permissions || { read: true, write: false },
        expiresAt:   dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy:   userId,
      },
    });

    return { key: raw, prefix, message: 'Bu açarı indi kopyalayın — bir daha göstərilməyəcək' };
  }

  async remove(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data:  { isActive: false },
    });
  }

  async validateKey(key: string): Promise<any> {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.prisma.apiKey.findFirst({
      where:   { keyHash: hash, isActive: true },
      include: { org: { select: { id: true, name: true, slug: true } } },
    });
    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data:  { lastUsedAt: new Date() },
    });
    return apiKey;
  }
}
