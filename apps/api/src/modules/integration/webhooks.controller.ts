import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';
import { WebhookAuthGuard } from '../../common/webhooks/webhook-auth.guard';
import { ProvisionWebhookDto } from './dto/provision.dto';
import { DeprovisionWebhookDto } from './dto/deprovision.dto';
import { UserSyncWebhookDto } from './dto/user-sync.dto';
import { IntegrationService } from './integration.service';

/**
 * Webhooks recebidos da Central de Acessos.
 * - @Public(): bypass do JwtAuthGuard/TenantGuard (a Central NÃO usa JWT).
 * - WebhookAuthGuard: valida o segredo compartilhado configurado.
 * Todos respondem 200 mesmo em replay (idempotência via WebhookDelivery).
 */
@Public()
@UseGuards(WebhookAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly integration: IntegrationService) {}

  @Post('provision')
  @HttpCode(200)
  provision(@Body() body: ProvisionWebhookDto) {
    return this.integration.provision(body);
  }

  @Post('deprovision')
  @HttpCode(200)
  deprovision(@Body() body: DeprovisionWebhookDto) {
    return this.integration.deprovision(body);
  }

  @Post('user-sync')
  @HttpCode(200)
  userSync(@Body() body: UserSyncWebhookDto) {
    return this.integration.userSync(body);
  }
}
