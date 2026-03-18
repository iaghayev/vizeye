import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}
  findAllRules(orgId:string){ return this.prisma.alertRule.findMany({where:{orgId},orderBy:{createdAt:'desc'}}); }
  async findOneRule(orgId:string,id:string){
    const r=await this.prisma.alertRule.findFirst({where:{id,orgId}});
    if(!r) throw new NotFoundException('Rule not found');
    return r;
  }
  createRule(orgId:string,dto:any){ return this.prisma.alertRule.create({data:{...dto,orgId,isActive:true,notificationChannelIds:dto.notificationChannelIds||[]}}); }
  async updateRule(orgId:string,id:string,dto:any){ await this.findOneRule(orgId,id); return this.prisma.alertRule.update({where:{id},data:dto}); }
  async deleteRule(orgId:string,id:string){ await this.findOneRule(orgId,id); return this.prisma.alertRule.delete({where:{id}}); }
  async toggleRule(orgId:string,id:string){ const r=await this.findOneRule(orgId,id); return this.prisma.alertRule.update({where:{id},data:{isActive:!r.isActive}}); }
  findAllEvents(orgId:string,q?:any){
    const where:any={orgId};
    if(q?.status) where.status=q.status;
    if(q?.severity) where.severity=q.severity;
    if(q?.assetId) where.assetId=q.assetId;
    return this.prisma.alertEvent.findMany({where,include:{rule:{select:{id:true,name:true,severity:true}},asset:{select:{id:true,name:true,environment:true}},monitor:{select:{id:true,name:true,monitorType:true}}},orderBy:{firedAt:'desc'},take:parseInt(q?.limit)||50,skip:((parseInt(q?.page)||1)-1)*(parseInt(q?.limit)||50)});
  }
  async getAlertSummary(orgId:string){
    const [critical,warning,info,resolved24h]=await Promise.all([
      this.prisma.alertEvent.count({where:{orgId,status:'firing',severity:'critical'}}),
      this.prisma.alertEvent.count({where:{orgId,status:'firing',severity:'warning'}}),
      this.prisma.alertEvent.count({where:{orgId,status:'firing',severity:'info'}}),
      this.prisma.alertEvent.count({where:{orgId,status:'resolved',resolvedAt:{gte:new Date(Date.now()-86400000)}}}),
    ]);
    return {critical,warning,info,totalFiring:critical+warning+info,resolved24h};
  }
  async resolveEvent(orgId:string,id:string){ return this.prisma.alertEvent.update({where:{id},data:{status:'resolved',resolvedAt:new Date()}}); }
  async findOneEvent(orgId:string,id:string){
    const e=await this.prisma.alertEvent.findFirst({where:{id,orgId},include:{rule:true,asset:true,monitor:true,notificationLogs:true}});
    if(!e) throw new NotFoundException('Alert event not found');
    return e;
  }
}
