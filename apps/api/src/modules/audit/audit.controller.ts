import { Controller, Get, Query } from '@nestjs/common';
import { AuditReadService } from './audit-read.service';
import { ListAuditDto } from './dto/list-audit.dto';
import { AuditSkip } from '../../common/audit/audit-action.decorator';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('audit')
@Roles('ORG_ADMIN', 'SUPER_ADMIN')
export class AuditController {
  constructor(private readonly service: AuditReadService) {}

  /**
   * Lista o trail de auditoria do tenant. Restrito a admins.
   * Listar audit log NÃO gera audit log (evita ruído).
   */
  @AuditSkip()
  @Get()
  list(@Query() q: ListAuditDto) {
    return this.service.list(q);
  }
}
