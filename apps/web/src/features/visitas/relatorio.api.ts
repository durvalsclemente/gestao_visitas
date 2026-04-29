import { api } from '../../shared/api/client';
import type {
  MotivoNaoRealizacao,
  RelatorioVisita,
} from './relatorio.types';

export interface CheckInPayload {
  latitude?: number;
  longitude?: number;
}

export type RelatorioPayload = Partial<{
  dataExecucao: string;
  horaInicio: string;
  horaFim: string;
  presencaFamilia: boolean;
  situacao: 'REALIZADA' | 'NAO_REALIZADA';
  motivoNaoRealizacao: MotivoNaoRealizacao;
  observacoesNaoRealizacao: string;
  condicoesResidencia: string;
  composicaoFamiliar: unknown;
  higiene: string;
  alimentacao: string;
  condicoesEmocionais: string;
  relacoesFamiliares: string;
  redeApoio: string;
  vulnerabilidade: string;
  comportamentoAssistido: string;
  relatos: string;
  dificuldades: string;
  impactosOsc: string;
  analiseTecnica: string;
  fatoresAgravantes: string;
  fatoresProtetivos: string;
  recomendacoes: string;
  planoInicial: string;
  criticidadeFinal: 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA';
  statusCaso: 'ATIVO' | 'EM_ACOMPANHAMENTO' | 'ENCAMINHADO' | 'ENCERRADO';
  assinanteNome: string;
  assinaturaImagem: string;
}>;

export type RelatorioModo = 'resumido' | 'completo';

export const relatorioPdfApi = {
  /** Payload completo (visita + assistido + visitadores + solicitação + triagem + relatório). */
  dados: async (visitaId: string): Promise<RelatorioDadosPayload> => {
    const { data } = await api.get<RelatorioDadosPayload>(
      `/visitas/${visitaId}/relatorio/dados`,
    );
    return data;
  },
  /** Baixa o PDF (resumido ou completo) e dispara o download no navegador. */
  download: async (visitaId: string, modo: RelatorioModo) => {
    const response = await api.get(`/visitas/${visitaId}/relatorio.pdf`, {
      params: { modo },
      responseType: 'blob',
    });
    const blob = response.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${visitaId.slice(0, 8)}-${modo}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

/**
 * Mesmo shape devolvido pelo backend (`/visitas/:id/relatorio/dados`).
 * Tipos parciais — só o necessário para a tela de preview.
 */
export interface RelatorioDadosPayload {
  id: string;
  tipo: string;
  status: string;
  dataAgendada: string;
  dataRealizada?: string | null;
  endereco?: string | null;
  checkInEm?: string | null;

  assistido: { id: string; nome: string; cpf?: string | null; endereco?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null };
  visitador: { id: string; nome: string; perfis: string[] };
  visitadorSecundario?: { id: string; nome: string; perfis: string[] } | null;
  tenant: { orgName?: string | null; cnpj?: string | null };

  relatorio?: {
    dataExecucao?: string | null;
    horaInicio?: string | null;
    horaFim?: string | null;
    presencaFamilia: boolean;
    situacao?: string | null;
    motivoNaoRealizacao?: string | null;
    observacoesNaoRealizacao?: string | null;
    composicaoFamiliar?: { nome: string; idade?: number; vinculo?: string }[] | null;
    condicoesResidencia?: string | null;
    higiene?: string | null;
    alimentacao?: string | null;
    condicoesEmocionais?: string | null;
    relacoesFamiliares?: string | null;
    redeApoio?: string | null;
    vulnerabilidade?: string | null;
    comportamentoAssistido?: string | null;
    relatos?: string | null;
    dificuldades?: string | null;
    impactosOsc?: string | null;
    analiseTecnica?: string | null;
    fatoresAgravantes?: string | null;
    fatoresProtetivos?: string | null;
    recomendacoes?: string | null;
    planoInicial?: string | null;
    criticidadeFinal?: string | null;
    statusCaso?: string | null;
    assinanteNome?: string | null;
    assinaturaImagem?: string | null;
    assinadoEm?: string | null;
    finalizadoEm?: string | null;
  } | null;

  solicitacoes: Array<{
    id: string;
    solicitanteExternalUserId: string;
    descricaoDetalhada: string;
    dataFatoGerador: string;
    frequencia: string;
    riscoImediato: boolean;
    necessidadeAvaliacaoTecnica: boolean;
    acoesJaRealizadas?: string | null;
    motivoPrincipal?: { nome: string } | null;
    motivosSecundarios: { nome: string }[];
    prioridade?: { nome: string; nivel: number } | null;
    programa?: { nome: string; tipo: string } | null;
    triagens: Array<{
      triadorExternalUserId: string;
      complexidade: string;
      decisao: string;
      tipoAtendimentoIndicado?: string | null;
      necessidadeDuplaVisita: boolean;
      necessidadePsicologo: boolean;
      necessidadeAssistenteSocial: boolean;
      dataLimiteRecomendada?: string | null;
      justificativaTecnica: string;
      prioridadeReclassificada?: { nome: string; nivel: number } | null;
      setorEncaminhamento?: { nome: string } | null;
      createdAt: string;
    }>;
  }>;
}

export const relatorioApi = {
  checkIn: async (visitaId: string, payload: CheckInPayload) => {
    const { data } = await api.post(`/visitas/${visitaId}/check-in`, payload);
    return data;
  },
  get: async (visitaId: string): Promise<RelatorioVisita | null> => {
    const { data } = await api.get<RelatorioVisita | null>(
      `/visitas/${visitaId}/relatorio`,
    );
    return data;
  },
  saveDraft: async (visitaId: string, payload: RelatorioPayload) => {
    const { data } = await api.put<RelatorioVisita>(
      `/visitas/${visitaId}/relatorio`,
      payload,
    );
    return data;
  },
  finalizar: async (visitaId: string, payload: RelatorioPayload) => {
    const { data } = await api.post<RelatorioVisita>(
      `/visitas/${visitaId}/relatorio/finalizar`,
      payload,
    );
    return data;
  },
  naoRealizada: async (
    visitaId: string,
    payload: { motivoNaoRealizacao: MotivoNaoRealizacao; observacoesNaoRealizacao?: string },
  ) => {
    const { data } = await api.post<RelatorioVisita>(
      `/visitas/${visitaId}/relatorio/nao-realizada`,
      payload,
    );
    return data;
  },
};
