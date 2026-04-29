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
  CreateProgramaDto,
  ListProgramaDto,
  UpdateProgramaDto,
} from './dto/programa.dto';

const LABEL = 'Programa';
const CONFLICT = 'Já existe um programa com este código';

@Controller('programas')
export class ProgramasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LookupCrudHelper,
  ) {}

  @Get()
  list(@Query() q: ListProgramaDto) {
    return this.helper.list(this.prisma.programa, q, {
      searchFields: ['nome', 'codigo', 'descricao'],
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      entityLabel: LABEL,
      conflictMessage: CONFLICT,
      buildExtraWhere: (query: ListProgramaDto) => (query.tipo ? { tipo: query.tipo } : {}),
    });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.helper.findOne(this.prisma.programa, id, LABEL);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateProgramaDto) {
    return this.helper.create(this.prisma.programa, dto, CONFLICT);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateProgramaDto) {
    return this.helper.update(this.prisma.programa, id, dto, LABEL, CONFLICT);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.helper.remove(this.prisma.programa, id, LABEL);
  }
}
