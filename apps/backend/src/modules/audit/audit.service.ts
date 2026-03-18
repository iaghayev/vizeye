import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  log(data:any){ return this.prisma.auditLog.create({data}); }
  findAll(orgId:string,q?:any){ return this.prisma.auditLog.findMany({where:{orgId},orderBy:{createdAt:'desc'},take:parseInt(q?.limit)||100}); }
}
