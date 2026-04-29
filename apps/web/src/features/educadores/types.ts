export type EducadorCargo = 'EDUCADOR' | 'COORDENADOR';

export interface Educador {
  id: string;
  organizationId: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cargo: EducadorCargo;
  formacao?: string | null;
  ativo: boolean;
  observacoes?: string | null;
  externalUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EducadorFormValues {
  nome: string;
  email?: string;
  telefone?: string;
  cargo: EducadorCargo;
  formacao?: string;
  ativo: boolean;
  observacoes?: string;
  externalUserId?: string;
}

export interface ListEducadoresQuery {
  page?: number;
  limit?: number;
  search?: string;
  cargo?: EducadorCargo;
  ativo?: boolean;
}
