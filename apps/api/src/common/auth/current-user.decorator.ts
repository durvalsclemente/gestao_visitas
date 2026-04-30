import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { OSCToken } from '@osc/auth-core';
import { fromOscToken, type CentralUser } from './central-user.types';

/**
 * Injeta o usuário no parâmetro do handler.
 *
 * Por padrão retorna o `CentralUser` legacy (compat com controllers existentes).
 * Use `@CurrentUser('token')` para receber o `OSCToken` cru.
 */
export const CurrentUser = createParamDecorator(
  (data: 'token' | undefined, ctx: ExecutionContext): CentralUser | OSCToken => {
    const req = ctx.switchToHttp().getRequest();
    const token = req.user as OSCToken;
    if (data === 'token') return token;
    return fromOscToken(token);
  },
);
