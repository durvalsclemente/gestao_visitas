import { Module } from '@nestjs/common';
import { HistoricoAssistidoController } from './historico-assistido.controller';
import { HistoricoAssistidoService } from './historico-assistido.service';

@Module({
  controllers: [HistoricoAssistidoController],
  providers: [HistoricoAssistidoService],
})
export class HistoricoAssistidoModule {}
