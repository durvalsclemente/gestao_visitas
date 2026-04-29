import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import type { AppEnv } from '../../config/env.validation';
import {
  VALID_CENTRAL_ROLES,
  type CentralJwtPayload,
  type CentralUser,
} from './central-user.types';

/**
 * Valida JWTs emitidos pela Central de Acessos.
 *
 * - Aceita apenas o algoritmo configurado (RS256 por padrão).
 * - Confere issuer e audience.
 * - passport-jwt já rejeita token ausente, malformado ou expirado
 *   (ignoreExpiration: false), retornando 401.
 * - validate() exige todos os claims obrigatórios e role válida;
 *   qualquer ausência dispara 401 antes de chegar no controller.
 *
 * NÃO criamos usuário/sessão local — devolvemos apenas a projeção
 * dos claims em CentralUser, que o NestJS injeta em request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'central-jwt') {
  constructor(config: ConfigService<AppEnv, true>) {
    const alg = config.get('CENTRAL_JWT_ALG', { infer: true });
    const secretOrKey =
      alg === 'RS256'
        ? config.get('CENTRAL_JWT_PUBLIC_KEY', { infer: true })!
        : config.get('CENTRAL_JWT_SECRET', { infer: true })!;

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: [alg],
      issuer: config.get('CENTRAL_JWT_ISSUER', { infer: true }),
      audience: config.get('CENTRAL_JWT_AUDIENCE', { infer: true }),
      secretOrKey,
    };

    super(options);
  }

  validate(payload: CentralJwtPayload): CentralUser {
    if (!payload || typeof payload !== 'object') {
      throw new UnauthorizedException('Token inválido');
    }

    const { sub, email, role, organizationId } = payload;

    if (typeof sub !== 'string' || sub.length === 0) {
      throw new UnauthorizedException('Token sem sub');
    }
    if (typeof email !== 'string' || email.length === 0) {
      throw new UnauthorizedException('Token sem email');
    }
    if (typeof organizationId !== 'string' || organizationId.length === 0) {
      throw new UnauthorizedException('Token sem organizationId');
    }
    if (!role || !VALID_CENTRAL_ROLES.has(role)) {
      throw new UnauthorizedException('Token com role inválida');
    }

    return {
      externalUserId: sub,
      email,
      centralRole: role,
      organizationId,
    };
  }
}
