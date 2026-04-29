import { Module } from '@nestjs/common';
import { PrioridadesController } from './prioridades.controller';

@Module({
  controllers: [PrioridadesController],
})
export class PrioridadesModule {}
