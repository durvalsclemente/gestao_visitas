import { Module } from '@nestjs/common';
import { PlanosAcaoController } from './planos-acao.controller';
import { PlanosAcaoService } from './planos-acao.service';

@Module({
  controllers: [PlanosAcaoController],
  providers: [PlanosAcaoService],
})
export class PlanosAcaoModule {}
