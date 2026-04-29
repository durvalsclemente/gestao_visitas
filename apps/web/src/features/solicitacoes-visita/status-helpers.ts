import type { Frequencia, SolicitacaoStatus } from './types';
import type { StatusTone } from '../../shared/ui';

export const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADA_TRIAGEM: 'Enviada para triagem',
  EM_TRIAGEM: 'Em triagem',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ENCAMINHADA: 'Encaminhada a outro setor',
  CONVERTIDA_VISITA: 'Convertida em visita',
};

export const STATUS_MAPPING: Record<SolicitacaoStatus, { label: string; tone: StatusTone }> = {
  RASCUNHO: { label: STATUS_LABEL.RASCUNHO, tone: 'neutral' },
  ENVIADA_TRIAGEM: { label: STATUS_LABEL.ENVIADA_TRIAGEM, tone: 'info' },
  EM_TRIAGEM: { label: STATUS_LABEL.EM_TRIAGEM, tone: 'warning' },
  APROVADA: { label: STATUS_LABEL.APROVADA, tone: 'success' },
  REJEITADA: { label: STATUS_LABEL.REJEITADA, tone: 'error' },
  ENCAMINHADA: { label: STATUS_LABEL.ENCAMINHADA, tone: 'info' },
  CONVERTIDA_VISITA: { label: STATUS_LABEL.CONVERTIDA_VISITA, tone: 'success' },
};

export const FREQUENCIA_LABEL: Record<Frequencia, string> = {
  UNICA: 'Única ocorrência',
  ESPORADICA: 'Esporádica',
  FREQUENTE: 'Frequente',
  CONTINUA: 'Contínua',
};
