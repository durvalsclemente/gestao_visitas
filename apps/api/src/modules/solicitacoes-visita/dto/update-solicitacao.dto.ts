import { PartialType } from '@nestjs/mapped-types';
import { CreateSolicitacaoVisitaDto } from './create-solicitacao.dto';

/**
 * Permite salvamento parcial em rascunho (todos os campos opcionais).
 * O service só exige campos completos no envio para triagem.
 */
export class UpdateSolicitacaoVisitaDto extends PartialType(CreateSolicitacaoVisitaDto) {}
