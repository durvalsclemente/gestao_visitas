import { Module } from '@nestjs/common';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
import { DisponibilidadesController } from './disponibilidades.controller';
import { DisponibilidadesService } from './disponibilidades.service';
import { RelatoriosVisitaController } from './relatorios-visita.controller';
import { RelatoriosVisitaService } from './relatorios-visita.service';
import { RelatorioPdfService } from './relatorio-pdf.service';

@Module({
  controllers: [
    VisitasController,
    DisponibilidadesController,
    RelatoriosVisitaController,
  ],
  providers: [
    VisitasService,
    DisponibilidadesService,
    RelatoriosVisitaService,
    RelatorioPdfService,
  ],
})
export class VisitasModule {}
