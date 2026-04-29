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
import { ParametrosService } from './parametros.service';
import { Roles } from '../../common/auth/roles.decorator';
import {
  CreateParametroDto,
  ListParametroDto,
  UpdateParametroDto,
} from './dto/parametro.dto';

@Controller('parametros')
export class ParametrosController {
  constructor(private readonly service: ParametrosService) {}

  @Get()
  list(@Query() q: ListParametroDto) {
    return this.service.list(q);
  }

  @Get('chave/:chave')
  findByChave(@Param('chave') chave: string) {
    return this.service.findByChave(chave);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateParametroDto) {
    return this.service.create(dto);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateParametroDto) {
    return this.service.update(id, dto);
  }

  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.remove(id);
  }
}
