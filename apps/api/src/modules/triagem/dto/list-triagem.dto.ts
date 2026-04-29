import { IsEnum, IsOptional } from 'class-validator';
import { SolicitacaoVisitaStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

/**
 * Fila de triagem: por padrão lista solicitações em
 * ENVIADA_TRIAGEM e EM_TRIAGEM. Opcionalmente filtra por um único.
 */
export class ListFilaTriagemDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SolicitacaoVisitaStatus)
  status?: SolicitacaoVisitaStatus;
}
