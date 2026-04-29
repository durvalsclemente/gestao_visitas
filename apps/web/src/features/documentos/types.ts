export type NivelSigilo = 'PUBLICO' | 'RESTRITO' | 'CONFIDENCIAL';

export type TipoDocumento =
  | 'IDENTIDADE'
  | 'COMPROVANTE_RESIDENCIA'
  | 'LAUDO_MEDICO'
  | 'LAUDO_PSICOLOGICO'
  | 'LAUDO_ASSISTENCIAL'
  | 'RELATORIO_TECNICO'
  | 'PARECER_JURIDICO'
  | 'PRONTUARIO'
  | 'AUTORIZACAO'
  | 'TERMO_CONSENTIMENTO'
  | 'FOTO'
  | 'OUTRO';

export type DocumentoParent =
  | 'assistido'
  | 'solicitacao'
  | 'visita'
  | 'relatorio'
  | 'planoAcao';

export interface Documento {
  id: string;
  organizationId: string;
  tipo: TipoDocumento;
  sigilo: NivelSigilo;
  nome: string;
  fileName: string;
  mimeType: string;
  tamanho: number;
  url: string;
  hash?: string | null;
  descricao?: string | null;

  assistidoId?: string | null;
  solicitacaoId?: string | null;
  visitaId?: string | null;
  relatorioId?: string | null;
  planoAcaoId?: string | null;

  uploadedByExternalUserId: string;
  uploadedAt: string;
  updatedAt: string;
}

export const TIPO_LABEL: Record<TipoDocumento, string> = {
  IDENTIDADE: 'Documento de identidade',
  COMPROVANTE_RESIDENCIA: 'Comprovante de residência',
  LAUDO_MEDICO: 'Laudo médico',
  LAUDO_PSICOLOGICO: 'Laudo psicológico',
  LAUDO_ASSISTENCIAL: 'Laudo assistencial',
  RELATORIO_TECNICO: 'Relatório técnico',
  PARECER_JURIDICO: 'Parecer jurídico',
  PRONTUARIO: 'Prontuário',
  AUTORIZACAO: 'Autorização',
  TERMO_CONSENTIMENTO: 'Termo de consentimento',
  FOTO: 'Foto',
  OUTRO: 'Outro',
};

export const SIGILO_LABEL: Record<NivelSigilo, string> = {
  PUBLICO: 'Público',
  RESTRITO: 'Restrito',
  CONFIDENCIAL: 'Confidencial',
};

export const DOCUMENTO_MAX_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/plain',
  'text/csv',
];
