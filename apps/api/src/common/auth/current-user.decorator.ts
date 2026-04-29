import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { CentralUser } from './central-user.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CentralUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as CentralUser;
  },
);
