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
import { PlanosAcaoService } from './planos-acao.service';
import {
  CreatePlanoAcaoDto,
  ListPlanosAcaoDto,
  UpdatePlanoAcaoDto,
} from './dto/plano.dto';
import { CreateAcaoDto, UpdateAcaoDto } from './dto/acao.dto';
import { RegistrarAcompanhamentoDto } from './dto/acompanhamento.dto';

@Controller('planos-acao')
export class PlanosAcaoController {
  constructor(private readonly service: PlanosAcaoService) {}

  // ----- Plano -----

  @Get()
  list(@Query() q: ListPlanosAcaoDto) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlanoAcaoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePlanoAcaoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.remove(id);
  }

  // ----- Ações -----

  @Post(':id/acoes')
  addAcao(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateAcaoDto,
  ) {
    return this.service.addAcao(id, dto);
  }

  @Patch(':id/acoes/:acaoId')
  updateAcao(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('acaoId', new ParseUUIDPipe()) acaoId: string,
    @Body() dto: UpdateAcaoDto,
  ) {
    return this.service.updateAcao(id, acaoId, dto);
  }

  @Delete(':id/acoes/:acaoId')
  @HttpCode(204)
  async removeAcao(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('acaoId', new ParseUUIDPipe()) acaoId: string,
  ) {
    await this.service.removeAcao(id, acaoId);
  }

  // ----- Acompanhamentos -----

  @Get(':id/acompanhamentos')
  listAcompanhamentos(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.listAcompanhamentos(id);
  }

  @Post(':id/acompanhamentos')
  registrarAcompanhamento(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RegistrarAcompanhamentoDto,
  ) {
    return this.service.registrarAcompanhamento(id, dto);
  }
}
