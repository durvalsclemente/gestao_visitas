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
  Query,
} from '@nestjs/common';
import { SolicitacoesVisitaService } from './solicitacoes-visita.service';
import { CreateSolicitacaoVisitaDto } from './dto/create-solicitacao.dto';
import { SaveRascunhoDto } from './dto/save-rascunho.dto';
import { ListSolicitacoesVisitaDto } from './dto/list-solicitacoes.dto';
import { AddAnexoDto } from './dto/add-anexo.dto';

@Controller('solicitacoes-visita')
export class SolicitacoesVisitaController {
  constructor(private readonly service: SolicitacoesVisitaService) {}

  @Get()
  list(@Query() q: ListSolicitacoesVisitaDto) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  /** Cria como rascunho (validação leve). */
  @Post('rascunho')
  saveRascunho(@Body() dto: SaveRascunhoDto) {
    return this.service.create(dto, 'RASCUNHO');
  }

  /** Cria já enviando para triagem (validação forte). */
  @Post()
  createAndSubmit(@Body() dto: CreateSolicitacaoVisitaDto) {
    return this.service.create(dto, 'ENVIADA_TRIAGEM');
  }

  /** Atualiza rascunho. Falha se já foi enviada para triagem. */
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: SaveRascunhoDto) {
    return this.service.update(id, dto);
  }

  /** Transição RASCUNHO → ENVIADA_TRIAGEM. */
  @Post(':id/enviar-triagem')
  enviarParaTriagem(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.enviarParaTriagem(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.remove(id);
  }

  // ----- Anexos (metadata-only por ora) -----

  @Post(':id/anexos')
  addAnexo(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AddAnexoDto) {
    return this.service.addAnexo(id, dto);
  }

  @Delete(':id/anexos/:anexoId')
  @HttpCode(204)
  async removeAnexo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('anexoId', new ParseUUIDPipe()) anexoId: string,
  ) {
    await this.service.removeAnexo(id, anexoId);
  }
}
