export interface Assistido {
  id: string;
  organizationId: string;
  nome: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistidoFormValues {
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
}

export interface ListAssistidosQuery {
  page?: number;
  limit?: number;
  search?: string;
  cidade?: string;
}
