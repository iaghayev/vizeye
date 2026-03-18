import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { MetricsModule } from '../metrics/metrics.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [MetricsModule, AssetsModule],
  controllers: [IngestController],
})
export class IngestModule {}
