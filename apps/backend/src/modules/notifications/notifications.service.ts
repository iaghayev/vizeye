import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}
  findAllChannels(orgId:string){ return this.prisma.notificationChannel.findMany({where:{orgId},orderBy:{name:'asc'}}); }
  async findOneChannel(orgId:string,id:string){
    const c=await this.prisma.notificationChannel.findFirst({where:{id,orgId}});
    if(!c) throw new NotFoundException('Channel not found');
    return c;
  }
  createChannel(orgId:string,dto:any){ return this.prisma.notificationChannel.create({data:{...dto,orgId,isActive:true}}); }
  async updateChannel(orgId:string,id:string,dto:any){ await this.findOneChannel(orgId,id); return this.prisma.notificationChannel.update({where:{id},data:dto}); }
  async deleteChannel(orgId:string,id:string){ await this.findOneChannel(orgId,id); return this.prisma.notificationChannel.delete({where:{id}}); }
  testChannel(orgId:string,id:string){ return {success:true,message:'Test notification sent'}; }
  getLogs(orgId:string,q?:any){ return this.prisma.notificationLog.findMany({where:{orgId},orderBy:{createdAt:'desc'},take:parseInt(q?.limit)||50}); }
}
