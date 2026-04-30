import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { HistoricoAssistidoService } from './historico-assistido.service';
import { CreateMatriculaDto, UpdateMatriculaDto } from './dto/matricula.dto';
import { Roles } from '../../common/auth/roles.decorator';

@Controller()
export class HistoricoAssistidoController {
  constructor(private readonly service: HistoricoAssistidoService) {}

  /** Visão 360º consolidada (multi-tenant). */
  @Get('assistidos/:id/historico')
  historico(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.loadHistorico(id);
  }

  /** Lista as matrículas (programas/atividades/cursos) do assistido. */
  @Get('assistidos/:id/matriculas')
  listMatriculas(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.listMatriculas(id);
  }

  @Roles('history.manage')
  @Post('matriculas')
  createMatricula(@Body() dto: CreateMatriculaDto) {
    return this.service.createMatricula(dto);
  }

  @Roles('history.manage')
  @Patch('matriculas/:id')
  updateMatricula(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMatriculaDto,
  ) {
    return this.service.updateMatricula(id, dto);
  }

  @Roles('history.manage')
  @Delete('matriculas/:id')
  @HttpCode(204)
  async removeMatricula(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.removeMatricula(id);
  }
}
