import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('webhooks/health')
  async webhookHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
