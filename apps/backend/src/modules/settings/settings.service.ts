import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}
  getSettings(orgId:string){ return this.prisma.organization.findUnique({where:{id:orgId},select:{settings:true}}); }
  updateSettings(orgId:string,dto:any){ return this.prisma.organization.update({where:{id:orgId},data:{settings:dto}}); }
}
