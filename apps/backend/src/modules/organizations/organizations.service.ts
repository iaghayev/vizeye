import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}
  findOne(id:string){ return this.prisma.organization.findUnique({where:{id},include:{_count:{select:{users:true,assets:true,monitors:true}}}}); }
  update(id:string,dto:any){ return this.prisma.organization.update({where:{id},data:dto}); }
  async getStats(orgId:string){
    const [totalAssets,activeMonitors,openIncidents,firingAlerts] = await Promise.all([
      this.prisma.asset.count({where:{orgId,isActive:true}}),
      this.prisma.monitor.count({where:{orgId,isActive:true}}),
      this.prisma.incident.count({where:{orgId,status:{in:['open','acknowledged','in_progress']}}}),
      this.prisma.alertEvent.count({where:{orgId,status:'firing'}}),
    ]);
    return {totalAssets,activeMonitors,openIncidents,firingAlerts};
  }
}
