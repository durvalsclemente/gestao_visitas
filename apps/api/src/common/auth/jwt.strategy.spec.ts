import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import type { CentralJwtPayload } from './central-user.types';

function makeStrategy(): JwtStrategy {
  const config = {
    get: (key: string) => {
      switch (key) {
        case 'CENTRAL_JWT_ALG':
          return 'HS256';
        case 'CENTRAL_JWT_SECRET':
          return 'test-secret';
        case 'CENTRAL_JWT_PUBLIC_KEY':
          return undefined;
        case 'CENTRAL_JWT_ISSUER':
          return 'central-acessos';
        case 'CENTRAL_JWT_AUDIENCE':
          return 'gestao-visitas';
        default:
          return undefined;
      }
    },
  } as unknown as ConfigService;
  return new JwtStrategy(config as never);
}

const validPayload: CentralJwtPayload = {
  sub: 'user-uuid-1',
  email: 'fulano@exemplo.com',
  role: 'ORG_ADMIN',
  organizationId: 'org-uuid-1',
  iat: 1_700_000_000,
  exp: 1_700_003_600,
};

describe('JwtStrategy.validate', () => {
  it('mapeia payload válido para CentralUser', () => {
    const strategy = makeStrategy();
    const user = strategy.validate(validPayload);
    expect(user).toEqual({
      externalUserId: 'user-uuid-1',
      email: 'fulano@exemplo.com',
      centralRole: 'ORG_ADMIN',
      organizationId: 'org-uuid-1',
    });
  });

  it.each([
    ['sub', { ...validPayload, sub: '' }],
    ['email', { ...validPayload, email: '' }],
    ['organizationId', { ...validPayload, organizationId: '' }],
  ])('rejeita payload sem %s', (_field, payload) => {
    const strategy = makeStrategy();
    expect(() => strategy.validate(payload as CentralJwtPayload)).toThrow(UnauthorizedException);
  });

  it('rejeita role desconhecida', () => {
    const strategy = makeStrategy();
    const bad = { ...validPayload, role: 'HACKER' } as unknown as CentralJwtPayload;
    expect(() => strategy.validate(bad)).toThrow(UnauthorizedException);
  });

  it('rejeita payload nulo/indefinido', () => {
    const strategy = makeStrategy();
    expect(() => strategy.validate(null as unknown as CentralJwtPayload)).toThrow(
      UnauthorizedException,
    );
  });
});
