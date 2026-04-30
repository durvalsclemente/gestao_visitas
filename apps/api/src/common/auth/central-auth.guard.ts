import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwksAuthGuard } from '@osc/auth-nest';
import { OSC_AUTH_VALIDATOR } from '@osc/auth-nest';
import { Inject } from '@nestjs/common';
import type { SealedJwksValidator } from '@osc/auth-core';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Guard global. Respeita `@Public()` (webhooks/health), senão delega para JwksAuthGuard
 * que decifra o JWE + verifica via JWKS e popula `req.user: OSCToken`.
 */
@Injectable()
export class CentralAuthGuard extends JwksAuthGuard {
  constructor(
    @Inject(OSC_AUTH_VALIDATOR) validator: SealedJwksValidator,
    private readonly reflector: Reflector,
  ) {
    super(validator);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
