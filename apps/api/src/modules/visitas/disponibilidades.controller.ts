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
} from '@nestjs/common';
import { DisponibilidadesService } from './disponibilidades.service';
import {
  CreateDisponibilidadeDto,
  UpdateDisponibilidadeDto,
} from './dto/disponibilidade.dto';

@Controller('visitadores/:visitadorId/disponibilidades')
export class DisponibilidadesController {
  constructor(private readonly service: DisponibilidadesService) {}

  @Get()
  list(@Param('visitadorId', new ParseUUIDPipe()) visitadorId: string) {
    return this.service.list(visitadorId);
  }

  @Post()
  create(
    @Param('visitadorId', new ParseUUIDPipe()) visitadorId: string,
    @Body() dto: CreateDisponibilidadeDto,
  ) {
    return this.service.create(visitadorId, dto);
  }

  @Patch(':id')
  update(
    @Param('visitadorId', new ParseUUIDPipe()) visitadorId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDisponibilidadeDto,
  ) {
    return this.service.update(visitadorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('visitadorId', new ParseUUIDPipe()) visitadorId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.service.remove(visitadorId, id);
  }
}
