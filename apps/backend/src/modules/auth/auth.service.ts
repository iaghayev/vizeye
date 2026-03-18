import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, comparePassword, hashToken, generateSecureToken, slugify } from '../../common/utils/hash.util';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: { organizationName: string; email: string; password: string; firstName?: string; lastName?: string }) {
    const slug = slugify(dto.organizationName);
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const org = await this.prisma.organization.create({
      data: { name: dto.organizationName, slug: `${slug}-${Date.now()}`, plan: 'free', settings: {} },
    });

    const user = await this.prisma.user.create({
      data: {
        orgId: org.id, email: dto.email, passwordHash: await hashPassword(dto.password),
        firstName: dto.firstName, lastName: dto.lastName, role: 'admin', isActive: true,
      },
      include: { org: { select: { id: true, name: true, slug: true, plan: true } } },
    });

    return this.issueTokens(user);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { org: { select: { id: true, name: true, slug: true, plan: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    const hash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: { include: { org: { select: { id: true, name: true, slug: true, plan: true } } } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date())
      throw new UnauthorizedException('Invalid or expired refresh token');

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string) {
    const hash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revokedAt: new Date() } });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { org: { select: { id: true, name: true, slug: true, plan: true } } },
    });
  }

  private async issueTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.orgId };
    const accessToken = this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
    const rawRefresh  = generateSecureToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id, orgId: user.orgId, tokenHash: hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, tokens: { accessToken, refreshToken: rawRefresh, expiresIn: process.env.JWT_EXPIRES_IN || '15m' } };
  }
}
