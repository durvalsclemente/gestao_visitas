import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Guard global que aplica a estratégia 'central-jwt'.
 *
 * Mapeia as falhas do passport-jwt em mensagens curtas e estáveis,
 * sem vazar detalhes internos:
 *   - sem header Authorization      → "Token ausente"
 *   - assinatura/issuer/aud inválidos → "Token inválido"
 *   - exp no passado                → "Token expirado"
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('central-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: { name?: string; message?: string } | undefined,
  ): TUser {
    if (err || !user) {
      const reason = mapAuthFailure(info, err);
      throw new UnauthorizedException(reason);
    }
    return user;
  }
}

function mapAuthFailure(
  info: { name?: string; message?: string } | undefined,
  err: Error | null,
): string {
  if (err instanceof UnauthorizedException) return err.message;
  switch (info?.name) {
    case 'TokenExpiredError':
      return 'Token expirado';
    case 'JsonWebTokenError':
      return 'Token inválido';
    case 'NotBeforeError':
      return 'Token ainda não é válido';
  }
  if (info?.message === 'No auth token') return 'Token ausente';
  return 'Não autenticado';
}
