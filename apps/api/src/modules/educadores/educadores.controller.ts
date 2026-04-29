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
import { EducadoresService } from './educadores.service';
import { CreateEducadorDto } from './dto/create-educador.dto';
import { UpdateEducadorDto } from './dto/update-educador.dto';
import { ListEducadoresDto } from './dto/list-educadores.dto';

@Controller('educadores')
export class EducadoresController {
  constructor(private readonly service: EducadoresService) {}

  @Get()
  list(@Query() q: ListEducadoresDto) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEducadorDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateEducadorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.remove(id);
  }
}
