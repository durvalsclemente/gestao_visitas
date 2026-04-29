import { Chip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RemoveIcon from '@mui/icons-material/Remove';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const MAP: Record<
  Priority,
  { label: string; color: 'default' | 'info' | 'warning' | 'error'; icon: React.ReactNode }
> = {
  LOW: { label: 'Baixa', color: 'default', icon: <KeyboardArrowDownIcon fontSize="small" /> },
  MEDIUM: { label: 'Média', color: 'info', icon: <RemoveIcon fontSize="small" /> },
  HIGH: { label: 'Alta', color: 'warning', icon: <KeyboardArrowUpIcon fontSize="small" /> },
  CRITICAL: { label: 'Crítica', color: 'error', icon: <PriorityHighIcon fontSize="small" /> },
};

interface PriorityChipProps {
  priority: Priority;
  size?: 'small' | 'medium';
}

export function PriorityChip({ priority, size = 'small' }: PriorityChipProps) {
  const entry = MAP[priority];
  return (
    <Chip
      label={entry.label}
      color={entry.color}
      icon={entry.icon as React.ReactElement}
      size={size}
      variant="outlined"
      aria-label={`Prioridade: ${entry.label}`}
      sx={{ fontWeight: 600 }}
    />
  );
}
