import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers['x-agent-key'] as string;
    if (!header || !header.includes(':')) throw new UnauthorizedException('Missing agent key');

    const [agentId, rawSecret] = header.split(':');
    const asset = await this.prisma.asset.findUnique({ where: { agentId } });
    if (!asset || !asset.agentSecretHash) throw new UnauthorizedException('Invalid agent key');

    const salt = process.env.AGENT_SECRET_SALT || 'default_salt';
    const hash = crypto.createHmac('sha256', salt).update(rawSecret).digest('hex');
    if (hash !== asset.agentSecretHash) throw new UnauthorizedException('Invalid agent key');

    req.asset = asset;
    return true;
  }
}
