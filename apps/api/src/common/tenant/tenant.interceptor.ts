import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { CentralUser } from '../auth/central-user.types';
import { tenantStorage } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest().user as CentralUser | undefined;
    if (!user?.organizationId) {
      return next.handle();
    }
    return new Observable((subscriber) => {
      tenantStorage.run(
        { organizationId: user.organizationId, externalUserId: user.externalUserId },
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
