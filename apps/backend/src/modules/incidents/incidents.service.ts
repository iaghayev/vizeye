import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}
  findAll(orgId:string,q?:any){
    const where:any={orgId};
    if(q?.status) where.status=q.status;
    if(q?.severity) where.severity=q.severity;
    return this.prisma.incident.findMany({where,include:{asset:{select:{id:true,name:true,environment:true}},assignedTo:{select:{id:true,firstName:true,lastName:true}},createdBy:{select:{id:true,firstName:true,lastName:true}},_count:{select:{comments:true}}},orderBy:[{createdAt:'desc'}],take:parseInt(q?.limit)||50});
  }
  async findOne(orgId:string,id:string){
    const i=await this.prisma.incident.findFirst({where:{id,orgId},include:{asset:true,assignedTo:true,createdBy:true,acknowledgedBy:true,resolvedBy:true,comments:{include:{user:{select:{id:true,firstName:true,lastName:true}}},orderBy:{createdAt:'asc'}}}});
    if(!i) throw new NotFoundException('Incident not found');
    return i;
  }
  create(orgId:string,dto:any,userId:string){ return this.prisma.incident.create({data:{...dto,orgId,createdById:userId,status:'open'}}); }
  async update(orgId:string,id:string,dto:any,userId:string){
    await this.findOne(orgId,id);
    const data:any={...dto};
    if(dto.status==='acknowledged'){data.acknowledgedById=userId;data.acknowledgedAt=new Date();}
    if(dto.status==='resolved'){data.resolvedById=userId;data.resolvedAt=new Date();}
    return this.prisma.incident.update({where:{id},data});
  }
  addComment(orgId:string,incidentId:string,content:string,userId:string){
    return this.prisma.incidentComment.create({data:{incidentId,userId,content,isSystem:false}});
  }
  async deleteComment(orgId:string,incidentId:string,commentId:string,userId:string,role:string){
    const c=await this.prisma.incidentComment.findFirst({where:{id:commentId,incidentId}});
    if(!c) throw new NotFoundException('Comment not found');
    if(c.isSystem) throw new ForbiddenException('Cannot delete system comments');
    if(c.userId!==userId&&role!=='admin'&&role!=='super_admin') throw new ForbiddenException();
    return this.prisma.incidentComment.delete({where:{id:commentId}});
  }
  async getStats(orgId:string){
    const [open,acknowledged,inProgress,resolved24h,critical]=await Promise.all([
      this.prisma.incident.count({where:{orgId,status:'open'}}),
      this.prisma.incident.count({where:{orgId,status:'acknowledged'}}),
      this.prisma.incident.count({where:{orgId,status:'in_progress'}}),
      this.prisma.incident.count({where:{orgId,status:'resolved',resolvedAt:{gte:new Date(Date.now()-86400000)}}}),
      this.prisma.incident.count({where:{orgId,severity:'critical',status:{notIn:['resolved','closed']}}}),
    ]);
    return {open,acknowledged,inProgress,resolved24h,critical};
  }
}
