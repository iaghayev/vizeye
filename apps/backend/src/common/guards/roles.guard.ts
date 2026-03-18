import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 4, admin: 3, engineer: 2, viewer: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return false;
    const userRank = ROLE_RANK[user.role as UserRole] ?? 0;
    return required.some(r => userRank >= ROLE_RANK[r]);
  }
}
