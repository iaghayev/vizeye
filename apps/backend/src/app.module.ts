import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host:     process.env.REDIS_HOST     || 'localhost',
        port:     parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AssetsModule,
    MonitorsModule,
    MetricsModule,
    AlertsModule,
    IncidentsModule,
    NotificationsModule,
    DashboardsModule,
    AuditModule,
    SettingsModule,
    HealthModule,
    IngestModule,
    WorkersModule,
  ],
})
export class AppModule {}
