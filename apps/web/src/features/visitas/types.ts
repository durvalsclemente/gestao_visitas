export type VisitaTipo = 'INICIAL' | 'ACOMPANHAMENTO' | 'ENCERRAMENTO' | 'EMERGENCIAL';
export type VisitaStatus =
  | 'AGENDADA'
  | 'REALIZADA'
  | 'NAO_REALIZADA'
  | 'CANCELADA'
  | 'REAGENDADA';

export type DiaSemana =
  | 'SEGUNDA'
  | 'TERCA'
  | 'QUARTA'
  | 'QUINTA'
  | 'SEXTA'
  | 'SABADO'
  | 'DOMINGO';

export interface VisitadorMini {
  id: string;
  nome: string;
  perfis: string[];
  regioes: string[];
  ativo: boolean;
}

export interface Visita {
  id: string;
  organizationId: string;
  tipo: VisitaTipo;
  status: VisitaStatus;
  dataAgendada: string;
  dataRealizada?: string | null;
  duracaoMinutos?: number | null;
  endereco?: string | null;
  observacoes?: string | null;
  resultado?: string | null;
  confirmadaEm?: string | null;
  confirmadaPorExternalUserId?: string | null;
  motivoCancelamento?: string | null;
  motivoReagendamento?: string | null;
  reagendamentoCount: number;

  assistido: { id: string; nome: string; cpf?: string | null };
  visitador: VisitadorMini;
  visitadorSecundario?: VisitadorMini | null;

  createdAt: string;
  updatedAt: string;
}

export interface DesignarPayload {
  solicitacaoId: string;
  visitadorId: string;
  visitadorSecundarioId?: string;
  tipo: VisitaTipo;
  dataAgendada: string;
  duracaoMinutos?: number;
  endereco?: string;
  observacoes?: string;
}

export interface AgendaQuery {
  page?: number;
  limit?: number;
  de?: string;
  ate?: string;
  visitadorId?: string;
  assistidoId?: string;
  status?: VisitaStatus;
}

export interface Disponibilidade {
  id: string;
  visitadorId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
}
