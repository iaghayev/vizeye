import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class MonitorsService {
  constructor(private prisma: PrismaService) {}
  findAll(orgId:string,q?:any){
    return this.prisma.monitor.findMany({where:{orgId,...(q?.assetId?{assetId:q.assetId}:{})},include:{asset:{select:{id:true,name:true}}},orderBy:{name:'asc'}});
  }
  async findOne(orgId:string,id:string){
    const m=await this.prisma.monitor.findFirst({where:{id,orgId},include:{asset:true}});
    if(!m) throw new NotFoundException('Monitor not found');
    return m;
  }
  create(orgId:string,dto:any){ return this.prisma.monitor.create({data:{...dto,orgId,config:dto.config||{},isActive:true,nextCheckAt:new Date()}}); }
  async update(orgId:string,id:string,dto:any){
    await this.findOne(orgId,id);
    return this.prisma.monitor.update({where:{id},data:dto});
  }
  async remove(orgId:string,id:string){
    await this.findOne(orgId,id);
    return this.prisma.monitor.delete({where:{id}});
  }
  getResults(orgId:string,monitorId:string,page=1,limit=50){
    const skip=(page-1)*limit;
    return this.prisma.checkResult.findMany({where:{monitorId,orgId},orderBy:{checkedAt:'desc'},skip,take:limit});
  }
  async getUptimeStats(orgId:string,monitorId:string,hours=24){
    const from=new Date(Date.now()-hours*3600*1000);
    const results=await this.prisma.checkResult.findMany({where:{monitorId,orgId,checkedAt:{gte:from}}});
    const total=results.length;
    const upChecks=results.filter(r=>r.status==='up').length;
    const downChecks=results.filter(r=>r.status==='down').length;
    const times=results.filter(r=>r.responseTimeMs!=null).map(r=>r.responseTimeMs as number);
    const avg=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;
    return {uptimePercent:total?Math.round(upChecks/total*10000)/100:100,totalChecks:total,upChecks,downChecks,avgResponseTimeMs:avg?Math.round(avg):null};
  }
  async updateAfterCheck(monitorId:string,status:any,responseTimeMs:number|null,intervalSec:number){
    await this.prisma.checkResult.create({data:{monitorId,orgId:(await this.prisma.monitor.findUnique({where:{id:monitorId},select:{orgId:true}}))!.orgId,status,responseTimeMs,checkedAt:new Date()}});
    return this.prisma.monitor.update({where:{id:monitorId},data:{lastStatus:status,lastCheckedAt:new Date(),nextCheckAt:new Date(Date.now()+intervalSec*1000)}});
  }
  findDueMonitors(){
    return this.prisma.monitor.findMany({where:{isActive:true,nextCheckAt:{lte:new Date()}},take:50});
  }
}
