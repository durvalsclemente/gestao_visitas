export type SituacaoVisita = 'REALIZADA' | 'NAO_REALIZADA';

export type MotivoNaoRealizacao =
  | 'ASSISTIDO_AUSENTE'
  | 'ENDERECO_NAO_LOCALIZADO'
  | 'RECUSA_DE_ATENDIMENTO'
  | 'RECUSA_DA_FAMILIA'
  | 'CONDICOES_INSEGURAS'
  | 'IMPREVISTO_VISITADOR'
  | 'OUTRO';

export type Criticidade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA';

export type StatusCaso = 'ATIVO' | 'EM_ACOMPANHAMENTO' | 'ENCAMINHADO' | 'ENCERRADO';

export interface MembroFamilia {
  nome: string;
  idade?: number;
  vinculo?: string;
}

export interface RelatorioVisita {
  id: string;
  visitaId: string;
  finalizadoEm?: string | null;
  finalizadoPorExternalUserId?: string | null;

  dataExecucao?: string | null;
  horaInicio?: string | null;
  horaFim?: string | null;
  presencaFamilia: boolean;

  situacao?: SituacaoVisita | null;
  motivoNaoRealizacao?: MotivoNaoRealizacao | null;
  observacoesNaoRealizacao?: string | null;

  condicoesResidencia?: string | null;
  composicaoFamiliar?: MembroFamilia[] | null;
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
  criticidadeFinal?: Criticidade | null;
  statusCaso?: StatusCaso | null;

  assinanteNome?: string | null;
  assinaturaImagem?: string | null;
  assinadoEm?: string | null;

  createdAt: string;
  updatedAt: string;
}

/** Estado completo do form do wizard (mantido client-side). */
export interface RelatorioFormState {
  dataExecucao: string;
  horaInicio: string;
  horaFim: string;
  presencaFamilia: boolean;

  situacao: SituacaoVisita | '';
  motivoNaoRealizacao: MotivoNaoRealizacao | '';
  observacoesNaoRealizacao: string;

  condicoesResidencia: string;
  composicaoFamiliar: MembroFamilia[];
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
  criticidadeFinal: Criticidade | '';
  statusCaso: StatusCaso | '';

  assinanteNome: string;
  assinaturaImagem: string;
}
