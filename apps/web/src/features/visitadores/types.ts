export interface Visitador {
  id: string;
  organizationId: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
  observacoes?: string | null;
  externalUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisitadorFormValues {
  nome: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  observacoes?: string;
  externalUserId?: string;
}

export interface ListVisitadoresQuery {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
}
