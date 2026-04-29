import { Chip, type ChipProps } from '@mui/material';

export type StatusTone = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

/**
 * Mapa padrão para os status do domínio Visita.
 * Pode ser estendido por callsite via prop `mapping`.
 */
const VISITA_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  AGENDADA: { label: 'Agendada', tone: 'info' },
  REALIZADA: { label: 'Realizada', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'error' },
  REAGENDADA: { label: 'Reagendada', tone: 'warning' },
};

const TONE_TO_COLOR: Record<StatusTone, ChipProps['color']> = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'default',
};

interface StatusChipProps {
  status: string;
  mapping?: Record<string, { label: string; tone: StatusTone }>;
  size?: 'small' | 'medium';
}

export function StatusChip({ status, mapping, size = 'small' }: StatusChipProps) {
  const map = { ...VISITA_STATUS, ...(mapping ?? {}) };
  const entry = map[status] ?? { label: status, tone: 'default' as StatusTone };
  return (
    <Chip
      label={entry.label}
      color={TONE_TO_COLOR[entry.tone]}
      size={size}
      variant="filled"
      aria-label={`Status: ${entry.label}`}
      sx={{ fontWeight: 600 }}
    />
  );
}
