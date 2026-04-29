import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [WebhooksController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
