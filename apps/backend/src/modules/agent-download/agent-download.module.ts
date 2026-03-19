import { Module } from '@nestjs/common';
import { AgentDownloadController } from './agent-download.controller';

@Module({ controllers: [AgentDownloadController] })
export class AgentDownloadModule {}
