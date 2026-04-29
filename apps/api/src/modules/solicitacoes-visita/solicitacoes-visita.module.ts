import { Module } from '@nestjs/common';
import { SolicitacoesVisitaController } from './solicitacoes-visita.controller';
import { SolicitacoesVisitaService } from './solicitacoes-visita.service';

@Module({
  controllers: [SolicitacoesVisitaController],
  providers: [SolicitacoesVisitaService],
})
export class SolicitacoesVisitaModule {}
