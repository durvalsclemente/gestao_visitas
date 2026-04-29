import { Module } from '@nestjs/common';
import { VisitadoresController } from './visitadores.controller';
import { VisitadoresService } from './visitadores.service';

@Module({
  controllers: [VisitadoresController],
  providers: [VisitadoresService],
})
export class VisitadoresModule {}
