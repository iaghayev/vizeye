import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: any) { return this.auth.register(dto); }

  @Public()
  @Post('login')
  login(@Body() dto: any) { return this.auth.login(dto); }

  @Public()
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) { return this.auth.refreshTokens(body.refreshToken); }

  @Post('logout')
  logout(@Body() body: { refreshToken: string }) { return this.auth.logout(body.refreshToken); }

  @ApiBearerAuth()
  @Get('me')
  getMe(@Request() req: any) { return this.auth.getMe(req.user.id); }
}
