import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { TriagemService } from './triagem.service';
import { DecisaoTriagemDto } from './dto/decisao-triagem.dto';
import { ListFilaTriagemDto } from './dto/list-triagem.dto';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('triagem')
export class TriagemController {
  constructor(private readonly service: TriagemService) {}

  /** Fila e histórico — leitura aberta a qualquer role. */
  @Get('fila')
  fila(@Query() q: ListFilaTriagemDto) {
    return this.service.listFila(q);
  }

  @Get('solicitacao/:solicitacaoId/historico')
  historico(@Param('solicitacaoId', new ParseUUIDPipe()) solicitacaoId: string) {
    return this.service.listHistorico(solicitacaoId);
  }

  /** Mutação: apenas coordenadores e administradores. */
  @Roles('triage.manage')
  @Post('solicitacao/:solicitacaoId/assumir')
  assumir(@Param('solicitacaoId', new ParseUUIDPipe()) solicitacaoId: string) {
    return this.service.assumir(solicitacaoId);
  }

  @Roles('triage.manage')
  @Post('solicitacao/:solicitacaoId/decidir')
  decidir(
    @Param('solicitacaoId', new ParseUUIDPipe()) solicitacaoId: string,
    @Body() dto: DecisaoTriagemDto,
  ) {
    return this.service.decidir(solicitacaoId, dto);
  }
}
