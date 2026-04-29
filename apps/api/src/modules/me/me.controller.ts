import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { CentralUser } from '../../common/auth/central-user.types';

/**
 * Endpoint de diagnóstico: devolve o contexto extraído do JWT.
 * NÃO consulta nem grava nada local (CLAUDE.md §2 / §6).
 * Útil para o frontend confirmar que o handshake com a Central funcionou.
 */
@Controller('me')
export class MeController {
  @Get()
  whoAmI(@CurrentUser() user: CentralUser): CentralUser {
    return user;
  }
}
