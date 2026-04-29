import { Box, Stack, Typography } from '@mui/material';

export interface HBarItem {
  label: string;
  value: number;
  color?: string;
}

interface HBarListProps {
  items: HBarItem[];
  /**
   * Cor padrão das barras (theme palette path como "primary.main" ou
   * cor literal "#1F4E79"). Pode ser sobrescrita por item.
   */
  color?: string;
  /** Mostra a contagem absoluta ao lado da barra. Default: true. */
  showCount?: boolean;
  /** Mensagem mostrada quando não há dados. */
  emptyMessage?: string;
  /** Limite de itens. Resto é resumido como "+N outros". */
  maxItems?: number;
}

/**
 * Lista de barras horizontais sem dependência de chart lib.
 * Calcula proporção a partir do maior valor da série e renderiza
 * com `Box` + `width: %`. Acessível: cada barra tem `aria-label`
 * com o valor absoluto.
 */
export function HBarList({
  items,
  color = 'primary.main',
  showCount = true,
  emptyMessage = 'Sem dados.',
  maxItems,
}: HBarListProps) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        {emptyMessage}
      </Typography>
    );
  }

  const visible = maxItems ? items.slice(0, maxItems) : items;
  const overflow = maxItems ? items.length - maxItems : 0;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <Stack spacing={1.2}>
      {visible.map((item, idx) => {
        const pct = (item.value / max) * 100;
        return (
          <Box key={`${item.label}-${idx}`}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%',
                }}
              >
                {item.label}
              </Typography>
              {showCount && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.value.toLocaleString('pt-BR')}
                </Typography>
              )}
            </Stack>
            <Box
              sx={{
                height: 8,
                bgcolor: 'action.hover',
                borderRadius: 999,
                overflow: 'hidden',
              }}
              role="img"
              aria-label={`${item.label}: ${item.value}`}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${pct}%`,
                  bgcolor: item.color ?? color,
                  borderRadius: 999,
                  transition: 'width .3s ease',
                }}
              />
            </Box>
          </Box>
        );
      })}
      {overflow > 0 && (
        <Typography variant="caption" color="text.secondary">
          +{overflow} outros
        </Typography>
      )}
    </Stack>
  );
}
