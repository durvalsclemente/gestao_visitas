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
import { LookupCrudHelper } from '../../common/lookup/lookup-crud.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/auth/roles.decorator';
import {
  CreateTipoEncaminhamentoDto,
  ListTipoEncaminhamentoDto,
  UpdateTipoEncaminhamentoDto,
} from './dto/tipo-encaminhamento.dto';

const LABEL = 'Tipo de encaminhamento';
const CONFLICT = 'Já existe um tipo de encaminhamento com este código';

@Controller('tipos-encaminhamento')
export class TiposEncaminhamentoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LookupCrudHelper,
  ) {}

  @Get()
  list(@Query() q: ListTipoEncaminhamentoDto) {
    return this.helper.list(this.prisma.tipoEncaminhamento, q, {
      searchFields: ['nome', 'codigo'],
      entityLabel: LABEL,
      conflictMessage: CONFLICT,
    });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.helper.findOne(this.prisma.tipoEncaminhamento, id, LABEL);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateTipoEncaminhamentoDto) {
    return this.helper.create(this.prisma.tipoEncaminhamento, dto, CONFLICT);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTipoEncaminhamentoDto) {
    return this.helper.update(this.prisma.tipoEncaminhamento, id, dto, LABEL, CONFLICT);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.helper.remove(this.prisma.tipoEncaminhamento, id, LABEL);
  }
}
