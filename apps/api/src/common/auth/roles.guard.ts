import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { CentralRole, CentralUser } from './central-user.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<CentralRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as CentralUser | undefined;
    if (!user) throw new ForbiddenException('Usuário não autenticado');

    if (!required.includes(user.centralRole)) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return true;
  }
}
