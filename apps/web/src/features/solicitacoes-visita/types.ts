export type SolicitacaoStatus =
  | 'RASCUNHO'
  | 'ENVIADA_TRIAGEM'
  | 'EM_TRIAGEM'
  | 'APROVADA'
  | 'REJEITADA'
  | 'ENCAMINHADA'
  | 'CONVERTIDA_VISITA';

export type Frequencia = 'UNICA' | 'ESPORADICA' | 'FREQUENTE' | 'CONTINUA';

export interface SolicitacaoAnexo {
  id: string;
  nome: string;
  mimeType: string;
  tamanho: number;
  url: string;
  createdAt: string;
}

export interface SolicitacaoVisita {
  id: string;
  organizationId: string;
  status: SolicitacaoStatus;

  assistido: { id: string; nome: string; cpf?: string | null };
  programa?: { id: string; nome: string; tipo: string } | null;
  motivoPrincipal?: { id: string; nome: string } | null;
  motivosSecundarios: { id: string; nome: string }[];
  prioridade?: { id: string; nome: string; nivel: number; cor?: string | null } | null;

  descricaoDetalhada: string;
  dataFatoGerador: string;
  frequencia: Frequencia;
  acoesJaRealizadas?: string | null;
  riscoImediato: boolean;
  necessidadeAvaliacaoTecnica: boolean;
  sugestaoPerfilVisitador?: string | null;
  observacoes?: string | null;

  solicitanteExternalUserId: string;
  enviadaTriagemEm?: string | null;

  anexos: SolicitacaoAnexo[];
  createdAt: string;
  updatedAt: string;
}

export interface SolicitacaoFormValues {
  assistidoId: string;
  programaId: string;
  motivoPrincipalId: string;
  motivosSecundariosIds: string[];
  prioridadeId: string;
  descricaoDetalhada: string;
  dataFatoGerador: string;
  frequencia: Frequencia | '';
  acoesJaRealizadas: string;
  riscoImediato: boolean;
  necessidadeAvaliacaoTecnica: boolean;
  sugestaoPerfilVisitador: string;
  observacoes: string;
}
