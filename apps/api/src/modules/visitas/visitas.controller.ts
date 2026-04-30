import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { DesignarVisitaDto } from './dto/designar-visita.dto';
import { ReagendarVisitaDto } from './dto/reagendar-visita.dto';
import { CancelarVisitaDto } from './dto/cancelar-visita.dto';
import { RealizarVisitaDto } from './dto/realizar-visita.dto';
import { AgendaQueryDto } from './dto/agenda-query.dto';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('visitas')
export class VisitasController {
  constructor(private readonly service: VisitasService) {}

  /** Agenda geral (com filtros opcionais por visitador, status, intervalo). */
  @Get('agenda')
  agenda(@Query() q: AgendaQueryDto) {
    return this.service.agenda(q);
  }

  /** Agenda de um visitador específico (atalho explícito). */
  @Get('agenda/visitador/:visitadorId')
  agendaVisitador(
    @Param('visitadorId', new ParseUUIDPipe()) visitadorId: string,
    @Query() q: AgendaQueryDto,
  ) {
    return this.service.agenda({ ...q, visitadorId });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  /** Designa visita a partir de uma solicitação APROVADA. */
  @Roles('visits.manage')
  @Post('designar')
  designar(@Body() dto: DesignarVisitaDto) {
    return this.service.designar(dto);
  }

  @Roles('visits.manage')
  @Patch(':id/reagendar')
  reagendar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReagendarVisitaDto,
  ) {
    return this.service.reagendar(id, dto);
  }

  @Roles('visits.manage')
  @Patch(':id/cancelar')
  cancelar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelarVisitaDto,
  ) {
    return this.service.cancelar(id, dto);
  }

  @Patch(':id/confirmar')
  confirmar(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.confirmar(id);
  }

  @Patch(':id/realizar')
  realizar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RealizarVisitaDto,
  ) {
    return this.service.realizar(id, dto);
  }
}
