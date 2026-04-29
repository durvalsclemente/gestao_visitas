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
  CreateMotivoVisitaDto,
  ListMotivoVisitaDto,
  UpdateMotivoVisitaDto,
} from './dto/motivo-visita.dto';

const LABEL = 'Motivo de visita';
const CONFLICT = 'Já existe um motivo de visita com este código';

@Controller('motivos-visita')
export class MotivosVisitaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LookupCrudHelper,
  ) {}

  @Get()
  list(@Query() q: ListMotivoVisitaDto) {
    return this.helper.list(this.prisma.motivoVisita, q, {
      searchFields: ['nome', 'codigo'],
      entityLabel: LABEL,
      conflictMessage: CONFLICT,
    });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.helper.findOne(this.prisma.motivoVisita, id, LABEL);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateMotivoVisitaDto) {
    return this.helper.create(this.prisma.motivoVisita, dto, CONFLICT);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateMotivoVisitaDto) {
    return this.helper.update(this.prisma.motivoVisita, id, dto, LABEL, CONFLICT);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.helper.remove(this.prisma.motivoVisita, id, LABEL);
  }
}
