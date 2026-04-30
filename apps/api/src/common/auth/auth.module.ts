import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OSCAuthModule, ActionsGuard } from '@osc/auth-nest';
import { CentralAuthGuard } from './central-auth.guard';

/**
 * Wireup de auth Central via @osc/auth-nest (ADRs 002, 008).
 *
 * - `OSCAuthModule.forRoot(...)` configura o validador (JWE+JWKS) global.
 * - `CentralAuthGuard` é aplicado globalmente e respeita `@Public()` (webhooks/health).
 * - `ActionsGuard` é aplicado globalmente e respeita `@RequireAction(...)`.
 */
@Module({
  imports: [
    OSCAuthModule.forRoot({
      jwksUri: process.env.CENTRAL_JWKS_URI ?? 'https://api.auth.osc.app.br/.well-known/jwks.json',
      issuer: process.env.CENTRAL_ISSUER ?? 'https://api.auth.osc.app.br',
      audience: process.env.CENTRAL_AUDIENCE ?? 'gestao-visitas',
      encryptionKeys: process.env.TOKEN_ENCRYPTION_KEYS ?? '',
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: CentralAuthGuard },
    { provide: APP_GUARD, useClass: ActionsGuard },
  ],
  exports: [],
})
export class AuthModule {}
