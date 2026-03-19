import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { validateConfig } from './app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AssetsModule } from './modules/assets/assets.module';
import { MonitorsModule } from './modules/monitors/monitors.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { WorkersModule } from './workers/workers.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { AgentDownloadModule } from './modules/agent-download/agent-download.module';
import { EventsModule } from './modules/events/events.module';
import { StatusPageModule } from './modules/status-page/status-page.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { SnmpController } from './modules/monitors/snmp.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    MulterModule.register({ dest: '/tmp' }),
    BullModule.forRoot({
      redis: {
        host:     process.env.REDIS_HOST     || 'localhost',
        port:     parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    PrismaModule, AuthModule, UsersModule, OrganizationsModule,
    AssetsModule, MonitorsModule, MetricsModule, AlertsModule,
    IncidentsModule, NotificationsModule, DashboardsModule,
    AuditModule, SettingsModule, HealthModule, IngestModule,
    WorkersModule, DiscoveryModule, AgentDownloadModule,
    EventsModule, StatusPageModule, MaintenanceModule, ApiKeysModule,
  ],
  controllers: [SnmpController],
})
export class AppModule {}
