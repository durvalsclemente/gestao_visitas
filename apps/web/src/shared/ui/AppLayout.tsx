import { useState, type ReactNode } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { AppSidebar, SIDEBAR_WIDTH } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(isMdUp);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppTopbar sidebarOpen={open} onToggleSidebar={() => setOpen((v) => !v)} />
      <AppSidebar open={open} onClose={() => setOpen(false)} />

      <Box
        component="main"
        role="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          mt: 8,
          ml: { xs: 0, md: open ? `${SIDEBAR_WIDTH}px` : 0 },
          transition: 'margin .2s ease',
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
