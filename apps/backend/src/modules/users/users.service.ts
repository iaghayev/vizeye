import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/hash.util';
import { UserRole } from '@prisma/client';

const RANK: Record<UserRole,number> = { super_admin:4,admin:3,engineer:2,viewer:1 };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(orgId: string, q?: string) {
    return this.prisma.user.findMany({
      where: { orgId, ...(q ? { OR:[{email:{contains:q,mode:'insensitive'}},{firstName:{contains:q,mode:'insensitive'}}] } : {}) },
      select: { id:true,email:true,firstName:true,lastName:true,role:true,isActive:true,lastLoginAt:true,createdAt:true },
    });
  }

  async findOne(orgId: string, id: string) {
    const u = await this.prisma.user.findFirst({ where:{id,orgId} });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async create(orgId: string, dto: any, actorRole: UserRole) {
    if (RANK[dto.role as UserRole] >= RANK[actorRole]) throw new ForbiddenException('Cannot create user with equal/higher role');
    const ex = await this.prisma.user.findFirst({ where:{orgId,email:dto.email} });
    if (ex) throw new ConflictException('Email already in use');
    return this.prisma.user.create({ data:{...dto,orgId,passwordHash:await hashPassword(dto.password),isActive:true} });
  }

  async update(orgId: string, id: string, dto: any, actorId: string, actorRole: UserRole) {
    const u = await this.findOne(orgId, id);
    if (u.id !== actorId && RANK[actorRole] < RANK['admin']) throw new ForbiddenException();
    const { password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) data.passwordHash = await hashPassword(password);
    return this.prisma.user.update({ where:{id}, data });
  }

  async remove(orgId: string, id: string, actorId: string) {
    if (id === actorId) throw new ForbiddenException('Cannot delete yourself');
    await this.findOne(orgId, id);
    return this.prisma.user.update({ where:{id}, data:{isActive:false} });
  }
}
