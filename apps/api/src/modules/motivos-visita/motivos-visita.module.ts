import { Module } from '@nestjs/common';
import { MotivosVisitaController } from './motivos-visita.controller';

@Module({
  controllers: [MotivosVisitaController],
})
export class MotivosVisitaModule {}
