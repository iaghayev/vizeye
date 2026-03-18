import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Deleting all data...');
  await prisma.auditLog.deleteMany({});
  await prisma.widget.deleteMany({});
  await prisma.dashboard.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.notificationChannel.deleteMany({});
  await prisma.incidentComment.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.alertEvent.deleteMany({});
  await prisma.alertRule.deleteMany({});
  await prisma.metric.deleteMany({});
  await prisma.checkResult.deleteMany({});
  await prisma.monitor.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log('✓ Done');
}
main().catch(console.error).finally(()=>prisma.$disconnect());
