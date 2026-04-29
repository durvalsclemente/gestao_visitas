export type PlanoAcaoStatus =
  | 'RASCUNHO'
  | 'ATIVO'
  | 'EM_REVISAO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface AcaoPlano {
  id: string;
  organizationId: string;
  planoId: string;
  ordem: number;
  descricao: string;
  responsavelExternalUserId?: string | null;
  prazo?: string | null;
  concluida: boolean;
  concluidaEm?: string | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcompanhamentoPlano {
  id: string;
  organizationId: string;
  planoId: string;
  evolucao: string;
  dificuldades?: string | null;
  proximosPassos?: string | null;
  necessitaNovaVisita: boolean;
  encerraCaso: boolean;
  createdByExternalUserId?: string | null;
  createdAt: string;
}

export interface PlanoAcao {
  id: string;
  organizationId: string;
  assistidoId: string;
  visitaId?: string | null;
  solicitacaoId?: string | null;

  objetivo: string;
  problemaPrincipal: string;
  areaResponsavel?: string | null;
  prazo?: string | null;
  indicadorSucesso?: string | null;
  status: PlanoAcaoStatus;
  dataRevisao?: string | null;
  responsaveisExternalUserIds: string[];

  createdAt: string;
  updatedAt: string;

  assistido: { id: string; nome: string; cpf?: string | null };
  visita?: { id: string; dataAgendada: string; status: string } | null;
  solicitacao?: { id: string; descricaoDetalhada: string } | null;
  acoes?: AcaoPlano[];
  acompanhamentos?: AcompanhamentoPlano[];
}

export interface PlanoFormValues {
  assistidoId: string;
  visitaId: string;
  solicitacaoId: string;
  objetivo: string;
  problemaPrincipal: string;
  areaResponsavel: string;
  prazo: string;
  indicadorSucesso: string;
  status: PlanoAcaoStatus;
  dataRevisao: string;
  responsaveisExternalUserIds: string[];
}
