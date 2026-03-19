import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetsImportService } from './assets-import.service';
import { AssetsPingService } from './assets-ping.service';

@Module({
  imports:     [MulterModule.register({ dest: '/tmp' })],
  providers:   [AssetsService, AssetsImportService, AssetsPingService],
  controllers: [AssetsController],
  exports:     [AssetsService, AssetsImportService, AssetsPingService],
})
export class AssetsModule {}
