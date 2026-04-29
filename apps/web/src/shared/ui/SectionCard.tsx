import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  dense?: boolean;
}

/**
 * Container padrão para blocos de conteúdo (formulários, listas
 * agrupadas, painéis de detalhes). Mantém ritmo vertical e
 * tipografia consistentes em todas as telas.
 */
export function SectionCard({ title, subtitle, actions, children, dense }: SectionCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      {(title || actions) && (
        <>
          <Box
            sx={{
              px: dense ? 2 : 3,
              py: dense ? 1.5 : 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {title && (
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {actions && (
              <Stack direction="row" spacing={1}>
                {actions}
              </Stack>
            )}
          </Box>
          <Divider />
        </>
      )}
      <CardContent sx={{ p: dense ? 2 : 3, '&:last-child': { pb: dense ? 2 : 3 } }}>
        {children}
      </CardContent>
    </Card>
  );
}
