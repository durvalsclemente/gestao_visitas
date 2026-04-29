import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { RelatoriosVisitaService } from './relatorios-visita.service';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateRelatorioVisitaDto } from './dto/update-relatorio.dto';
import { NaoRealizadaDto } from './dto/nao-realizada.dto';
import { RelatorioPdfService } from './relatorio-pdf.service';
import { RelatorioPdfQueryDto } from './dto/relatorio-pdf.dto';

@Controller('visitas/:visitaId')
export class RelatoriosVisitaController {
  constructor(
    private readonly service: RelatoriosVisitaService,
    private readonly pdfService: RelatorioPdfService,
  ) {}

  /** Marca chegada do visitador no local (cria rascunho do relatório). */
  @Post('check-in')
  checkIn(
    @Param('visitaId', new ParseUUIDPipe()) visitaId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.service.checkIn(visitaId, dto);
  }

  /** Lê o relatório atual (ou null se ainda não houve check-in/rascunho). */
  @Get('relatorio')
  getRelatorio(@Param('visitaId', new ParseUUIDPipe()) visitaId: string) {
    return this.service.getRelatorio(visitaId);
  }

  /** Salvamento parcial — usado a cada passo do wizard. */
  @Put('relatorio')
  upsert(
    @Param('visitaId', new ParseUUIDPipe()) visitaId: string,
    @Body() dto: UpdateRelatorioVisitaDto,
  ) {
    return this.service.upsertRascunho(visitaId, dto);
  }

  /** Finaliza o relatório (valida campos obrigatórios e atualiza status da Visita). */
  @Post('relatorio/finalizar')
  finalizar(
    @Param('visitaId', new ParseUUIDPipe()) visitaId: string,
    @Body() dto: UpdateRelatorioVisitaDto,
  ) {
    return this.service.finalizar(visitaId, dto);
  }

  /** Atalho: marca a visita como NÃO REALIZADA com motivo. */
  @Post('relatorio/nao-realizada')
  naoRealizada(
    @Param('visitaId', new ParseUUIDPipe()) visitaId: string,
    @Body() dto: NaoRealizadaDto,
  ) {
    return this.service.marcarNaoRealizada(visitaId, dto);
  }

  /**
   * Payload completo (visita + assistido + visitadores + solicitação +
   * triagem + relatório) já filtrado por tenant. Usado pela tela de
   * preview para garantir paridade visual com o PDF gerado.
   */
  @Get('relatorio/dados')
  dados(@Param('visitaId', new ParseUUIDPipe()) visitaId: string) {
    return this.pdfService.loadDados(visitaId);
  }

  /** Gera o PDF do relatório e devolve como binário. */
  @Get('relatorio.pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @Param('visitaId', new ParseUUIDPipe()) visitaId: string,
    @Query() q: RelatorioPdfQueryDto,
    @Res() reply: FastifyReply,
  ) {
    const buffer = await this.pdfService.gerarPdf(visitaId, q.modo ?? 'completo');
    reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `inline; filename="relatorio-${visitaId.slice(0, 8)}-${q.modo ?? 'completo'}.pdf"`,
      )
      .send(buffer);
  }
}
