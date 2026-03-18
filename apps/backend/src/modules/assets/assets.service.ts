import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSecureToken, hashAgentSecret } from '../../common/utils/hash.util';
import * as crypto from 'crypto';
@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}
  findAll(orgId:string,q?:any){
    const where:any={orgId,isActive:true};
    if(q?.search) where.name={contains:q.search,mode:'insensitive'};
    if(q?.environment) where.environment=q.environment;
    if(q?.criticality) where.criticality=q.criticality;
    return this.prisma.asset.findMany({where,include:{_count:{select:{monitors:true}}},orderBy:{name:'asc'}});
  }
  async findOne(orgId:string,id:string){
    const a=await this.prisma.asset.findFirst({where:{id,orgId},include:{monitors:true,_count:{select:{monitors:true}}}});
    if(!a) throw new NotFoundException('Asset not found');
    return a;
  }
  create(orgId:string,dto:any){ return this.prisma.asset.create({data:{...dto,orgId,isActive:true,metadata:dto.metadata||{},tags:dto.tags||[]}}); }
  async update(orgId:string,id:string,dto:any){
    await this.findOne(orgId,id);
    return this.prisma.asset.update({where:{id},data:dto});
  }
  async remove(orgId:string,id:string){
    await this.findOne(orgId,id);
    return this.prisma.asset.update({where:{id},data:{isActive:false}});
  }
  async generateAgentToken(orgId:string,id:string){
    await this.findOne(orgId,id);
    const agentId=`agent_${crypto.randomBytes(8).toString('hex')}`;
    const rawSecret=generateSecureToken(24);
    const salt=process.env.AGENT_SECRET_SALT||'salt';
    const agentSecretHash=hashAgentSecret(rawSecret,salt);
    await this.prisma.asset.update({where:{id},data:{agentId,agentSecretHash}});
    return {agentId,agentSecret:rawSecret,enrollmentKey:`${agentId}:${rawSecret}`};
  }
  updateLastSeen(assetId:string){ return this.prisma.asset.update({where:{id:assetId},data:{lastSeenAt:new Date()}}); }
}
