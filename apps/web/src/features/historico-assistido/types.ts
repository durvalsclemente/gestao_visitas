import type { Assistido } from '../assistidos/types';

export interface MatriculaAssistido {
  id: string;
  organizationId: string;
  assistidoId: string;
  programaId: string;
  dataInicio?: string | null;
  dataFim?: string | null;
  ativa: boolean;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
  programa: { id: string; nome: string; tipo: string };
}

export interface HistoricoSolicitacao {
  id: string;
  status: string;
  descricaoDetalhada: string;
  dataFatoGerador: string;
  riscoImediato: boolean;
  necessidadeAvaliacaoTecnica: boolean;
  enviadaTriagemEm?: string | null;
  triadaEm?: string | null;
  solicitanteExternalUserId: string;
  createdAt: string;
  motivoPrincipal?: { id: string; nome: string } | null;
  motivosSecundarios: { id: string; nome: string }[];
  prioridade?: { id: string; nome: string; nivel: number; cor?: string | null } | null;
  programa?: { id: string; nome: string; tipo: string } | null;
  triagens: Array<{
    id: string;
    triadorExternalUserId: string;
    complexidade: string;
    decisao: string;
    statusAnterior: string;
    statusNovo: string;
    createdAt: string;
    justificativaTecnica: string;
    prioridadeReclassificada?: { nome: string; nivel: number } | null;
    setorEncaminhamento?: { nome: string } | null;
  }>;
}

export interface HistoricoVisita {
  id: string;
  status: string;
  tipo: string;
  dataAgendada: string;
  dataRealizada?: string | null;
  endereco?: string | null;
  confirmadaEm?: string | null;
  motivoCancelamento?: string | null;
  reagendamentoCount: number;
  visitador: { id: string; nome: string; perfis: string[] };
  visitadorSecundario?: { id: string; nome: string; perfis: string[] } | null;
  relatorio?: {
    id: string;
    situacao?: string | null;
    criticidadeFinal?: string | null;
    statusCaso?: string | null;
    finalizadoEm?: string | null;
    recomendacoes?: string | null;
  } | null;
  createdAt: string;
}

export interface HistoricoPlano {
  id: string;
  status: string;
  objetivo: string;
  problemaPrincipal: string;
  areaResponsavel?: string | null;
  prazo?: string | null;
  dataRevisao?: string | null;
  responsaveisExternalUserIds: string[];
  createdAt: string;
  updatedAt: string;
  acoes: Array<{
    id: string;
    descricao: string;
    concluida: boolean;
    concluidaEm?: string | null;
    prazo?: string | null;
    responsavelExternalUserId?: string | null;
    createdAt: string;
  }>;
  acompanhamentos: Array<{
    id: string;
    evolucao: string;
    dificuldades?: string | null;
    proximosPassos?: string | null;
    necessitaNovaVisita: boolean;
    encerraCaso: boolean;
    createdAt: string;
    createdByExternalUserId?: string | null;
  }>;
}

export interface HistoricoAnexo {
  id: string;
  nome: string;
  mimeType: string;
  tamanho: number;
  url: string;
  createdAt: string;
  visita?: { id: string; dataAgendada: string };
  solicitacao?: { id: string; descricaoDetalhada: string };
}

export interface HistoricoAssistido {
  assistido: Assistido;
  matriculas: MatriculaAssistido[];
  solicitacoes: HistoricoSolicitacao[];
  visitas: HistoricoVisita[];
  planosAcao: HistoricoPlano[];
  anexos: {
    deVisitas: HistoricoAnexo[];
    deSolicitacoes: HistoricoAnexo[];
  };
}
