import type { SolicitacaoStatus, SolicitacaoVisita } from '../solicitacoes-visita/types';

export type TriagemComplexidade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA';

export type TriagemDecisao =
  | 'APROVAR_VISITA'
  | 'DEVOLVER_COMPLEMENTACAO'
  | 'REJEITAR'
  | 'RECLASSIFICAR_PRIORIDADE'
  | 'ENCAMINHAR_OUTRO_SETOR';

export interface Triagem {
  id: string;
  solicitacaoId: string;
  triadorExternalUserId: string;
  complexidade: TriagemComplexidade;
  tipoAtendimentoIndicado?: string | null;
  necessidadeDuplaVisita: boolean;
  necessidadePsicologo: boolean;
  necessidadeAssistenteSocial: boolean;
  dataLimiteRecomendada?: string | null;
  justificativaTecnica: string;
  decisao: TriagemDecisao;
  prioridadeReclassificada?: { id: string; nome: string; nivel: number } | null;
  setorEncaminhamento?: { id: string; nome: string } | null;
  statusAnterior: SolicitacaoStatus;
  statusNovo: SolicitacaoStatus;
  createdAt: string;
}

export interface TriagemDecisaoFormValues {
  complexidade: TriagemComplexidade | '';
  tipoAtendimentoIndicado: string;
  necessidadeDuplaVisita: boolean;
  necessidadePsicologo: boolean;
  necessidadeAssistenteSocial: boolean;
  dataLimiteRecomendada: string;
  justificativaTecnica: string;
  decisao: TriagemDecisao | '';
  prioridadeReclassificadaId: string;
  setorEncaminhamentoId: string;
}

/** Item simplificado retornado pela fila. */
export type FilaItem = Pick<
  SolicitacaoVisita,
  | 'id'
  | 'status'
  | 'descricaoDetalhada'
  | 'dataFatoGerador'
  | 'enviadaTriagemEm'
  | 'riscoImediato'
  | 'createdAt'
> & {
  assistido: { id: string; nome: string; cpf?: string | null };
  motivoPrincipal?: { id: string; nome: string } | null;
  prioridade?: { id: string; nome: string; nivel: number; cor?: string | null } | null;
};
