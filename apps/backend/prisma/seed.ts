import { PrismaClient, UserRole, AssetType, Environment, Criticality, MonitorType, CheckStatus, AlertSeverity, AlertEventStatus, IncidentSeverity, IncidentStatus, IncidentSource, NotificationChannelType, WidgetType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient({ log:['warn','error'] });

function hashAgentSecret(raw:string,salt:string){ return crypto.createHmac('sha256',salt).update(raw).digest('hex'); }
function daysAgo(d:number,h=0,m=0){ const dt=new Date(); dt.setUTCDate(dt.getUTCDate()-d); dt.setUTCHours(h,m,0,0); return dt; }
function minutesAgo(m:number){ return new Date(Date.now()-m*60*1000); }

async function main(){
  console.log('\n╔══════════════════════════╗\n║  VizEye Seed Starting    ║\n╚══════════════════════════╝\n');
  const existing = await prisma.organization.findFirst({where:{slug:'acme-corp'}});
  if(existing){ console.log('Already seeded — skipping.'); return; }

  const org = await prisma.organization.create({ data:{name:'Acme Corporation',slug:'acme-corp',plan:'pro',settings:{timezone:'UTC'}} });
  const pw = await bcrypt.hash('Demo1234!',10);
  const [admin,eng,ops,viewer] = await Promise.all([
    prisma.user.create({data:{orgId:org.id,email:'admin@acme.local',passwordHash:pw,firstName:'Sarah',lastName:'Chen',role:UserRole.admin,isActive:true,lastLoginAt:minutesAgo(35)}}),
    prisma.user.create({data:{orgId:org.id,email:'engineer@acme.local',passwordHash:pw,firstName:'Marcus',lastName:'Webb',role:UserRole.engineer,isActive:true,lastLoginAt:minutesAgo(120)}}),
    prisma.user.create({data:{orgId:org.id,email:'ops@acme.local',passwordHash:pw,firstName:'Priya',lastName:'Nair',role:UserRole.engineer,isActive:true,lastLoginAt:daysAgo(1,9)}}),
    prisma.user.create({data:{orgId:org.id,email:'viewer@acme.local',passwordHash:pw,firstName:'Tom',lastName:'Russo',role:UserRole.viewer,isActive:true,lastLoginAt:daysAgo(2)}}),
  ]);
  console.log('✓ 4 users created');

  const salt = process.env.AGENT_SECRET_SALT||'dev_agent_salt_32_characters_here_abc';
  async function mkAsset(d:any){
    const id=`agent_${crypto.randomBytes(8).toString('hex')}`;
    const raw=crypto.randomBytes(24).toString('hex');
    return prisma.asset.create({data:{orgId:org.id,...d,isActive:true,agentId:id,agentSecretHash:hashAgentSecret(raw,salt),agentVersion:'1.0.0',lastSeenAt:minutesAgo(2),metadata:d.metadata||{},tags:d.tags||[]}});
  }

  const [web,dbp,dbr,app,stg] = await Promise.all([
    mkAsset({name:'web-server-01',assetType:AssetType.server,hostname:'web-server-01.acme.internal',ipAddress:'10.0.1.10',osName:'Ubuntu',osVersion:'22.04 LTS',environment:Environment.production,criticality:Criticality.critical,location:'us-east-1a',description:'Primary web server',tags:['web','nginx','production']}),
    mkAsset({name:'db-primary-01',assetType:AssetType.server,hostname:'db-primary-01.acme.internal',ipAddress:'10.0.1.20',osName:'Ubuntu',osVersion:'22.04 LTS',environment:Environment.production,criticality:Criticality.critical,location:'us-east-1a',description:'PostgreSQL primary',tags:['database','postgresql','production']}),
    mkAsset({name:'db-replica-01',assetType:AssetType.server,hostname:'db-replica-01.acme.internal',ipAddress:'10.0.1.21',osName:'Ubuntu',osVersion:'22.04 LTS',environment:Environment.production,criticality:Criticality.high,location:'us-east-1b',description:'PostgreSQL replica',tags:['database','replica']}),
    mkAsset({name:'app-server-02',assetType:AssetType.server,hostname:'app-server-02.acme.internal',ipAddress:'10.0.1.30',osName:'Debian',osVersion:'12 Bookworm',environment:Environment.production,criticality:Criticality.high,location:'us-east-1b',description:'Application server',tags:['app','nodejs','production']}),
    mkAsset({name:'staging-01',assetType:AssetType.vm,hostname:'staging-01.acme.internal',ipAddress:'10.0.2.10',osName:'Ubuntu',osVersion:'22.04 LTS',environment:Environment.staging,criticality:Criticality.medium,location:'us-west-2a',description:'Staging environment',tags:['staging']}),
  ]);
  console.log('✓ 5 assets created');

  const [m1,m2,m3,m4] = await Promise.all([
    prisma.monitor.create({data:{orgId:org.id,assetId:web.id,name:'Homepage HTTPS',monitorType:MonitorType.https,target:'https://acme.com',intervalSec:60,timeoutSec:10,isActive:true,lastStatus:CheckStatus.up,lastCheckedAt:minutesAgo(1),nextCheckAt:new Date(Date.now()+59000),config:{method:'GET',expectedStatus:200,degradedThresholdMs:1500}}}),
    prisma.monitor.create({data:{orgId:org.id,assetId:web.id,name:'API Health',monitorType:MonitorType.https,target:'https://api.acme.com/health',intervalSec:30,timeoutSec:5,isActive:true,lastStatus:CheckStatus.up,lastCheckedAt:minutesAgo(1),nextCheckAt:new Date(Date.now()+29000),config:{method:'GET',expectedStatus:200}}}),
    prisma.monitor.create({data:{orgId:org.id,assetId:dbp.id,name:'PostgreSQL Primary TCP',monitorType:MonitorType.tcp,target:'10.0.1.20:5432',intervalSec:30,timeoutSec:5,isActive:true,lastStatus:CheckStatus.up,lastCheckedAt:minutesAgo(1),nextCheckAt:new Date(Date.now()+29000),config:{}}}),
    prisma.monitor.create({data:{orgId:org.id,assetId:web.id,name:'SSL Certificate',monitorType:MonitorType.ssl_expiry,target:'acme.com:443',intervalSec:3600,timeoutSec:10,isActive:true,lastStatus:CheckStatus.up,lastCheckedAt:minutesAgo(30),nextCheckAt:new Date(Date.now()+3570000),config:{warningDaysBeforeExpiry:14}}}),
  ]);
  console.log('✓ 4 monitors created');

  // Synthetic check results (100 per monitor)
  const results:any[]=[];
  const monitors=[{id:m1.id,baseMs:185},{id:m2.id,baseMs:72},{id:m3.id,baseMs:4},{id:m4.id,baseMs:null}];
  for(const {id,baseMs} of monitors){
    for(let i=0;i<100;i++){
      const t=new Date(Date.now()-(100-i)*60*1000);
      const down=[20,21,22].includes(i);
      results.push({monitorId:id,orgId:org.id,status:down?'down':'up',responseTimeMs:down||!baseMs?null:Math.round(baseMs*(0.8+Math.random()*0.4)),checkedAt:t,metadata:{}});
    }
  }
  await prisma.checkResult.createMany({data:results,skipDuplicates:true});
  console.log(`✓ ${results.length} check results`);

  // Synthetic metrics (50 per metric per asset)
  const metrics:any[]=[];
  const assets=[{a:web,cpu:40,mem:62,disk:41},{a:dbp,cpu:22,mem:78,disk:67},{a:app,cpu:45,mem:55,disk:33}];
  for(const {a,cpu,mem,disk} of assets){
    for(let i=0;i<50;i++){
      const t=new Date(Date.now()-(50-i)*60*60*1000);
      metrics.push({orgId:org.id,assetId:a.id,metricName:'cpu.usage_percent',value:Math.round(Math.max(1,Math.min(99,cpu+(Math.random()*20-10)))*100)/100,time:t,tags:{}});
      metrics.push({orgId:org.id,assetId:a.id,metricName:'mem.usage_percent',value:Math.round(Math.max(1,Math.min(99,mem+(Math.random()*10-5)))*100)/100,time:t,tags:{}});
      metrics.push({orgId:org.id,assetId:a.id,metricName:'disk.usage_percent',value:Math.round(Math.max(1,Math.min(99,disk+(Math.random()*4-2)))*100)/100,time:t,tags:{}});
    }
  }
  await prisma.metric.createMany({data:metrics,skipDuplicates:true});
  console.log(`✓ ${metrics.length} metric points`);

  const [ch1,ch2] = await Promise.all([
    prisma.notificationChannel.create({data:{orgId:org.id,name:'Ops Team Email',channelType:NotificationChannelType.email,isActive:true,config:{to:['ops@acme.com']}}}),
    prisma.notificationChannel.create({data:{orgId:org.id,name:'Slack #incidents',channelType:NotificationChannelType.slack,isActive:true,config:{webhookUrl:'https://hooks.slack.com/services/xxx'}}}),
  ]);

  const [r1,r2,r3] = await Promise.all([
    prisma.alertRule.create({data:{orgId:org.id,name:'High CPU Usage',description:'CPU > 90% for 3 checks',targetType:'org',metricName:'cpu.usage_percent',condition:{operator:'gt',threshold:90,consecutiveCount:3},severity:AlertSeverity.critical,notificationChannelIds:[ch1.id,ch2.id],isActive:true}}),
    prisma.alertRule.create({data:{orgId:org.id,name:'High Memory Usage',description:'Memory > 85%',targetType:'org',metricName:'mem.usage_percent',condition:{operator:'gt',threshold:85,consecutiveCount:2},severity:AlertSeverity.warning,notificationChannelIds:[ch1.id],isActive:true}}),
    prisma.alertRule.create({data:{orgId:org.id,name:'Homepage Down',description:'3 consecutive failures',targetType:'monitor',targetId:m1.id,condition:{operator:'eq',status:'down',consecutiveFailures:3},severity:AlertSeverity.critical,notificationChannelIds:[ch1.id,ch2.id],isActive:true}}),
  ]);

  const [ev1,ev2] = await Promise.all([
    prisma.alertEvent.create({data:{orgId:org.id,ruleId:r1.id,assetId:app.id,status:AlertEventStatus.firing,severity:AlertSeverity.critical,message:'cpu.usage_percent = 92.4 on app-server-02',value:92.4,firedAt:minutesAgo(18)}}),
    prisma.alertEvent.create({data:{orgId:org.id,ruleId:r2.id,assetId:dbp.id,status:AlertEventStatus.firing,severity:AlertSeverity.warning,message:'mem.usage_percent = 87.1 on db-primary-01',value:87.1,firedAt:minutesAgo(42)}}),
  ]);
  console.log('✓ Alert rules + events created');

  const [inc1,inc2,inc3] = await Promise.all([
    prisma.incident.create({data:{orgId:org.id,title:'Elevated CPU on app-server-02',description:'CPU > 90% for 18 minutes. Engineering investigating.',severity:IncidentSeverity.critical,status:IncidentStatus.open,source:IncidentSource.alert,assetId:app.id,createdById:admin.id,assignedToId:eng.id,createdAt:minutesAgo(18)}}),
    prisma.incident.create({data:{orgId:org.id,title:'db-primary-01 memory elevated to 87%',description:'Related to overnight batch job.',severity:IncidentSeverity.high,status:IncidentStatus.acknowledged,source:IncidentSource.alert,assetId:dbp.id,createdById:admin.id,assignedToId:ops.id,acknowledgedById:ops.id,acknowledgedAt:minutesAgo(35),createdAt:minutesAgo(42)}}),
    prisma.incident.create({data:{orgId:org.id,title:'Homepage HTTPS down — Nginx config error',description:'7 min outage due to bad nginx config. Rolled back.',severity:IncidentSeverity.critical,status:IncidentStatus.resolved,source:IncidentSource.alert,assetId:web.id,createdById:admin.id,assignedToId:eng.id,acknowledgedById:eng.id,acknowledgedAt:daysAgo(4,3,13),resolvedById:eng.id,resolvedAt:daysAgo(4,3,19),createdAt:daysAgo(4,3,12)}}),
  ]);

  await prisma.incidentComment.createMany({data:[
    {incidentId:inc1.id,userId:eng.id,content:'Checking process list. Top consumer is the data sync job.',isSystem:false,createdAt:minutesAgo(15)},
    {incidentId:inc1.id,userId:eng.id,content:'Killing the job now. Monitoring for next 10 mins.',isSystem:false,createdAt:minutesAgo(8)},
    {incidentId:inc2.id,userId:ops.id,content:'Batch job wrote 2.1GB overnight. Memory should normalize in ~30 min.',isSystem:false,createdAt:minutesAgo(35)},
    {incidentId:inc3.id,userId:eng.id,content:'Rolled back nginx config. Site is back up.',isSystem:false,createdAt:daysAgo(4,3,16)},
    {incidentId:inc3.id,userId:admin.id,content:'Post-mortem Thursday. Adding config validation to deploy pipeline.',isSystem:false,createdAt:daysAgo(4,3,45)},
  ]});
  console.log('✓ 3 incidents + comments created');

  const dash = await prisma.dashboard.create({data:{orgId:org.id,name:'Production Overview',description:'Real-time production overview',isDefault:true,createdById:admin.id,layout:[{i:'w1',x:0,y:0,w:3,h:3},{i:'w2',x:3,y:0,w:3,h:3},{i:'w3',x:6,y:0,w:3,h:3},{i:'w4',x:9,y:0,w:3,h:3},{i:'w5',x:0,y:3,w:6,h:6},{i:'w6',x:6,y:3,w:6,h:6}]}});
  await prisma.widget.createMany({data:[
    {dashboardId:dash.id,orgId:org.id,title:'Total Assets',widgetType:WidgetType.stat_card,config:{metric:'totalAssets',source:'org-stats'},position:{i:'w1'}},
    {dashboardId:dash.id,orgId:org.id,title:'Active Monitors',widgetType:WidgetType.stat_card,config:{metric:'activeMonitors',source:'org-stats'},position:{i:'w2'}},
    {dashboardId:dash.id,orgId:org.id,title:'Firing Alerts',widgetType:WidgetType.stat_card,config:{metric:'firingAlerts',source:'org-stats'},position:{i:'w3'}},
    {dashboardId:dash.id,orgId:org.id,title:'Open Incidents',widgetType:WidgetType.stat_card,config:{metric:'openIncidents',source:'org-stats'},position:{i:'w4'}},
    {dashboardId:dash.id,orgId:org.id,title:'CPU — web-server-01',widgetType:WidgetType.metric_chart,config:{assetId:web.id,metricName:'cpu.usage_percent',aggregation:'avg',resolution:'1h',hours:24,unit:'%'},position:{i:'w5'}},
    {dashboardId:dash.id,orgId:org.id,title:'Recent Alert Events',widgetType:WidgetType.alert_list,config:{limit:10},position:{i:'w6'}},
  ]});

  await prisma.auditLog.createMany({data:[
    {orgId:org.id,userId:admin.id,action:'user.created',resourceType:'User',resourceId:eng.id,metadata:{email:'engineer@acme.local'},ipAddress:'192.168.1.1',createdAt:daysAgo(10)},
    {orgId:org.id,userId:admin.id,action:'monitor.created',resourceType:'Monitor',resourceId:m1.id,metadata:{name:'Homepage HTTPS'},ipAddress:'192.168.1.1',createdAt:daysAgo(9)},
    {orgId:org.id,userId:eng.id,action:'incident.resolved',resourceType:'Incident',resourceId:inc3.id,metadata:{resolvedAfterMin:7},ipAddress:'192.168.1.2',createdAt:daysAgo(4,3,19)},
  ]});

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Seed Complete                                       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  admin@acme.local     / Demo1234!  (admin)           ║');
  console.log('║  engineer@acme.local  / Demo1234!  (engineer)        ║');
  console.log('║  ops@acme.local       / Demo1234!  (engineer)        ║');
  console.log('║  viewer@acme.local    / Demo1234!  (viewer)          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(e=>{console.error('Seed failed:',e);process.exit(1);}).finally(()=>prisma.$disconnect());
