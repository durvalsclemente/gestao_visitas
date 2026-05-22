import { useMemo, useState, type ReactNode } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { LicenseBanner, LicenseFooter, useCentralLicense } from '@osc/ui-master';
import { useAuth } from '../auth/auth.context';
import { AppSidebar, SIDEBAR_WIDTH } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

const APP_SLUG = 'gestao-visitas';

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(isMdUp);
  const { token } = useAuth();

  const centralClient = useMemo(
    () => ({
      baseUrl: `${(import.meta.env.VITE_CENTRAL_URL ?? '').replace(/\/$/, '')}/api/v1`,
      getToken: () => token,
    }),
    [token],
  );
  const { status: licenseStatus } = useCentralLicense(centralClient, APP_SLUG);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppTopbar sidebarOpen={open} onToggleSidebar={() => setOpen((v) => !v)} />
      <AppSidebar open={open} onClose={() => setOpen(false)} />

      <Box
        component="main"
        role="main"
        sx={{
          flexGrow: 1,
          mt: 8,
          ml: { xs: 0, md: open ? `${SIDEBAR_WIDTH}px` : 0 },
          transition: 'margin .2s ease',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LicenseBanner status={licenseStatus} />
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>{children}</Box>
        <LicenseFooter status={licenseStatus} />
      </Box>
    </Box>
  );
}
