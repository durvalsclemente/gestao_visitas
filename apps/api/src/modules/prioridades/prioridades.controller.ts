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
  CreatePrioridadeDto,
  ListPrioridadeDto,
  UpdatePrioridadeDto,
} from './dto/prioridade.dto';

const LABEL = 'Prioridade';
const CONFLICT = 'Já existe uma prioridade com este código';

@Controller('prioridades')
export class PrioridadesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LookupCrudHelper,
  ) {}

  @Get()
  list(@Query() q: ListPrioridadeDto) {
    return this.helper.list(this.prisma.prioridade, q, {
      searchFields: ['nome', 'codigo'],
      orderBy: [{ nivel: 'desc' }, { nome: 'asc' }],
      entityLabel: LABEL,
      conflictMessage: CONFLICT,
    });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.helper.findOne(this.prisma.prioridade, id, LABEL);
  }

  @Roles('priorities.manage')
  @Post()
  create(@Body() dto: CreatePrioridadeDto) {
    return this.helper.create(this.prisma.prioridade, dto, CONFLICT);
  }

  @Roles('priorities.manage')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePrioridadeDto) {
    return this.helper.update(this.prisma.prioridade, id, dto, LABEL, CONFLICT);
  }

  @Roles('priorities.manage')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.helper.remove(this.prisma.prioridade, id, LABEL);
  }
}
