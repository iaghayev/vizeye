import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { Public } from '../../common/decorators/public.decorator';

@Controller('agent')
export class AgentDownloadController {

  @Public()
  @Get('download/:filename')
  download(@Param('filename') filename: string, @Res() res: Response) {
    // Güvənlik: yalnız vizeye-agent-* fayllarına icazə
    if (!filename.startsWith('vizeye-agent-')) {
      throw new NotFoundException('File not found');
    }

    const filePath = join(process.cwd(), 'public', 'agent', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Binary "${filename}" tapılmadı. Əvvəlcə build edin.`);
    }

    res.download(filePath, filename);
  }

  @Public()
  @Get('binaries')
  list() {
    const dir = join(process.cwd(), 'public', 'agent');
    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(dir).filter((f: string) => f.startsWith('vizeye-agent-'));
      return { binaries: files };
    } catch {
      return { binaries: [] };
    }
  }
}
