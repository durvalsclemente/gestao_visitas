import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { OSCToken } from '@osc/auth-core';
import { tenantStorage } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest().user as OSCToken | undefined;
    const organizationId = user?.org?.id;
    if (!organizationId) {
      return next.handle();
    }
    return new Observable((subscriber) => {
      tenantStorage.run(
        { organizationId, externalUserId: user!.sub },
        () => {
          next
            .handle()
            .subscribe({
              next: (v) => subscriber.next(v),
              error: (e) => subscriber.error(e),
              complete: () => subscriber.complete(),
            });
        },
      );
    });
  }
}
