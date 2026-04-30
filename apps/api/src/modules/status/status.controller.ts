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
import { CreateStatusDto, ListStatusDto, UpdateStatusDto } from './dto/status.dto';

const LABEL = 'Status';
const CONFLICT = 'Já existe um status com este código nesta categoria';

@Controller('status')
export class StatusController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LookupCrudHelper,
  ) {}

  @Get()
  list(@Query() q: ListStatusDto) {
    return this.helper.list(this.prisma.status, q, {
      searchFields: ['nome', 'codigo'],
      entityLabel: LABEL,
      conflictMessage: CONFLICT,
      buildExtraWhere: (query: ListStatusDto) =>
        query.categoria ? { categoria: query.categoria } : {},
    });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.helper.findOne(this.prisma.status, id, LABEL);
  }

  @Roles('status.manage')
  @Post()
  create(@Body() dto: CreateStatusDto) {
    return this.helper.create(this.prisma.status, dto, CONFLICT);
  }

  @Roles('status.manage')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStatusDto) {
    return this.helper.update(this.prisma.status, id, dto, LABEL, CONFLICT);
  }

  @Roles('status.manage')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.helper.remove(this.prisma.status, id, LABEL);
  }
}
