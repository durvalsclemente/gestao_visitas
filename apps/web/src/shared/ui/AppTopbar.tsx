import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../auth/auth.context';
import { SIDEBAR_WIDTH } from './AppSidebar';

interface AppTopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AppTopbar({ sidebarOpen, onToggleSidebar }: AppTopbarProps) {
  const { user, signOut } = useAuth();

  return (
    <AppBar
      position="fixed"
      color="primary"
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        ml: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
        width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%',
        transition: 'all .2s ease',
      }}
      role="banner"
    >
      <Toolbar>
        <Tooltip title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
            aria-expanded={sidebarOpen}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          Gestão de Visitas
        </Typography>

        {user && (
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', mr: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {user.email}
            </Typography>
          </Box>
        )}

        <Tooltip title="Sair (volta à Central de Acessos)">
          <IconButton color="inherit" onClick={signOut} aria-label="Sair da aplicação">
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
