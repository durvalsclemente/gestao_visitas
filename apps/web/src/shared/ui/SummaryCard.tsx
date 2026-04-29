import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  helperText?: string;
  loading?: boolean;
  /** Cor do ícone (paleta MUI). Padrão: primary. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * Card métrico para dashboards (1 KPI por card).
 * Mantém valor em destaque tipográfico e ícone como dica visual.
 */
export function SummaryCard({
  label,
  value,
  icon,
  helperText,
  loading,
  color = 'primary',
}: SummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {icon && (
          <Box
            aria-hidden
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: (t) => t.palette[color].main + '14',
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            {label}
          </Typography>
          <Typography variant="h5" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {loading ? <Skeleton width={80} /> : value}
          </Typography>
          {helperText && (
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
