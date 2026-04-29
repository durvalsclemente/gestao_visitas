import { Module } from '@nestjs/common';
import { TiposEncaminhamentoController } from './tipos-encaminhamento.controller';

@Module({
  controllers: [TiposEncaminhamentoController],
})
export class TiposEncaminhamentoModule {}
