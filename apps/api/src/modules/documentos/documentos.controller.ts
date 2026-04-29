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
import { DocumentosService } from './documentos.service';
import {
  CreateDocumentoDto,
  ListDocumentosDto,
  UpdateDocumentoDto,
} from './dto/documento.dto';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { CentralUser } from '../../common/auth/central-user.types';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  list(@Query() q: ListDocumentosDto, @CurrentUser() user: CentralUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CentralUser,
  ) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateDocumentoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDocumentoDto,
    @CurrentUser() user: CentralUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CentralUser,
  ) {
    await this.service.remove(id, user);
  }
}
