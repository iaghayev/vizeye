import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}
  async ingest(asset:any, metrics:any[]){
    await this.prisma.metric.createMany({
      data: metrics.map((m:any)=>({orgId:asset.orgId,assetId:asset.id,metricName:m.name,value:m.value,time:m.timestamp?new Date(m.timestamp):new Date(),tags:m.tags||{}})),
      skipDuplicates:true,
    });
    await this.prisma.asset.update({where:{id:asset.id},data:{lastSeenAt:new Date()}});
    return {ingested:metrics.length};
  }
  heartbeat(asset:any){ return this.prisma.asset.update({where:{id:asset.id},data:{lastSeenAt:new Date()}}); }
  query(assetId:string,q:any){
    const where:any={assetId,...(q.metricName?{metricName:q.metricName}:{}),time:{gte:new Date(q.from||Date.now()-86400000),lte:new Date(q.to||Date.now())}};
    return this.prisma.metric.findMany({where,orderBy:{time:'asc'},take:2000});
  }
  getLatest(assetId:string){
    return this.prisma.$queryRaw`
      SELECT DISTINCT ON ("metricName") "metricName", value, time
      FROM metrics WHERE "assetId"=${assetId}
      ORDER BY "metricName", time DESC
    `;
  }
}
