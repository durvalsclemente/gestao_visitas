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
import { VisitadoresService } from './visitadores.service';
import { CreateVisitadorDto } from './dto/create-visitador.dto';
import { UpdateVisitadorDto } from './dto/update-visitador.dto';
import { ListVisitadoresDto } from './dto/list-visitadores.dto';

@Controller('visitadores')
export class VisitadoresController {
  constructor(private readonly service: VisitadoresService) {}

  @Get()
  list(@Query() q: ListVisitadoresDto) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVisitadorDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateVisitadorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.remove(id);
  }
}
