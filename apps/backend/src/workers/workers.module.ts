import { Module } from '@nestjs/common';
export const QUEUE_UPTIME_CHECK  = 'uptime-check';
export const QUEUE_ALERT_EVAL    = 'alert-eval';
export const QUEUE_NOTIFICATIONS = 'notifications';
export const QUEUE_METRIC_AGG    = 'metric-aggregation';
@Module({})
export class WorkersModule {}
