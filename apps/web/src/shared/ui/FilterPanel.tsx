import { useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface FilterPanelProps {
  children: ReactNode;
  /** Quantos filtros estão ativos — exibido como contador. */
  activeCount?: number;
  onClear?: () => void;
  defaultOpen?: boolean;
  title?: string;
}

/**
 * Painel colapsável para filtros de listagem.
 * Em mobile vem fechado por padrão; em desktop, aberto.
 */
export function FilterPanel({
  children,
  activeCount = 0,
  onClear,
  defaultOpen,
  title = 'Filtros',
}: FilterPanelProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(defaultOpen ?? isMdUp);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
        }}
      >
        <FilterListIcon fontSize="small" color="action" aria-hidden />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {title}
          {activeCount > 0 && (
            <Box
              component="span"
              sx={{
                ml: 1,
                px: 1,
                py: 0.25,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
              }}
              aria-label={`${activeCount} filtros ativos`}
            >
              {activeCount}
            </Box>
          )}
        </Typography>
        {onClear && activeCount > 0 && (
          <Button size="small" onClick={onClear}>
            Limpar
          </Button>
        )}
        <IconButton
          size="small"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Recolher filtros' : 'Expandir filtros'}
        >
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2, pt: 0 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          >
            {children}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
