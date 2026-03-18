import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}
  findAll(orgId:string){ return this.prisma.dashboard.findMany({where:{orgId},include:{_count:{select:{widgets:true}}},orderBy:{createdAt:'desc'}}); }
  getDefault(orgId:string){ return this.prisma.dashboard.findFirst({where:{orgId,isDefault:true},include:{widgets:true}}); }
  async findOne(orgId:string,id:string){
    const d=await this.prisma.dashboard.findFirst({where:{id,orgId},include:{widgets:true}});
    if(!d) throw new NotFoundException('Dashboard not found');
    return d;
  }
  async create(orgId:string,dto:any,userId:string){
    if(dto.isDefault) await this.prisma.dashboard.updateMany({where:{orgId,isDefault:true},data:{isDefault:false}});
    return this.prisma.dashboard.create({data:{...dto,orgId,createdById:userId,layout:dto.layout||[]}});
  }
  async update(orgId:string,id:string,dto:any){ await this.findOne(orgId,id); return this.prisma.dashboard.update({where:{id},data:dto}); }
  async remove(orgId:string,id:string){ await this.findOne(orgId,id); return this.prisma.dashboard.delete({where:{id}}); }
  addWidget(orgId:string,dashboardId:string,dto:any){ return this.prisma.widget.create({data:{...dto,orgId,dashboardId,config:dto.config||{},position:dto.position||{}}}); }
  async updateWidget(orgId:string,dashboardId:string,id:string,dto:any){ return this.prisma.widget.update({where:{id},data:dto}); }
  async removeWidget(orgId:string,dashboardId:string,id:string){ return this.prisma.widget.delete({where:{id}}); }
}
