import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { CentralUser } from '../auth/central-user.types';

/**
 * Garante que a organização do usuário possui um tenant ativo neste app.
 * Em caso negativo, responde 403 — a Central deve ter feito provision antes.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const user = context.switchToHttp().getRequest().user as CentralUser | undefined;
    if (!user) throw new ForbiddenException('Sem usuário autenticado');

    const tenant = await this.prisma.organizationTenant.findUnique({
      where: { organizationId: user.organizationId },
      select: { active: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Organização ainda não provisionada para este aplicativo');
    }
    if (!tenant.active) {
      throw new ForbiddenException('Licença suspensa pela Central de Acessos');
    }
    return true;
  }
}
