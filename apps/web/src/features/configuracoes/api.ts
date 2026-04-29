import { makeCrud } from '../../shared/api/crud';

export type ProgramaTipo = 'ATIVIDADE' | 'CURSO' | 'PROJETO';

export interface LookupItem {
  id: string;
  organizationId: string;
  nome: string;
  codigo?: string | null;
  cor?: string | null;
  ativo: boolean;
  ordem?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LookupCommonForm {
  nome: string;
  codigo?: string;
  cor?: string;
  ordem?: number;
  ativo?: boolean;
}

export interface Programa extends Omit<LookupItem, 'ordem'> {
  tipo: ProgramaTipo;
  descricao?: string | null;
  cargaHoraria?: number | null;
}
export interface ProgramaForm {
  nome: string;
  codigo?: string;
  tipo: ProgramaTipo;
  descricao?: string;
  cor?: string;
  cargaHoraria?: number;
  ativo?: boolean;
}

export interface Prioridade extends Omit<LookupItem, 'ordem'> {
  nivel: number;
}
export interface PrioridadeForm extends Omit<LookupCommonForm, 'ordem'> {
  nivel?: number;
}

export interface StatusItem extends LookupItem {
  categoria?: string | null;
}
export interface StatusForm extends LookupCommonForm {
  categoria?: string;
}

export interface ParametroApp {
  id: string;
  organizationId: string;
  chave: string;
  valor: unknown;
  descricao?: string | null;
  categoria?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ParametroForm {
  chave: string;
  valor: unknown;
  descricao?: string;
  categoria?: string;
}

interface ListBase { page?: number; limit?: number; search?: string; ativo?: boolean }

export const motivosVisitaApi = makeCrud<LookupItem, LookupCommonForm, Partial<LookupCommonForm>, ListBase>('motivos-visita');
export const tiposEncaminhamentoApi = makeCrud<LookupItem, LookupCommonForm, Partial<LookupCommonForm>, ListBase>('tipos-encaminhamento');
export const prioridadesApi = makeCrud<Prioridade, PrioridadeForm, Partial<PrioridadeForm>, ListBase>('prioridades');
export const statusApi = makeCrud<StatusItem, StatusForm, Partial<StatusForm>, ListBase & { categoria?: string }>('status');
export const programasApi = makeCrud<Programa, ProgramaForm, Partial<ProgramaForm>, ListBase & { tipo?: ProgramaTipo }>('programas');
export const parametrosApi = makeCrud<ParametroApp, ParametroForm, Partial<ParametroForm>, ListBase & { categoria?: string }>('parametros');
