import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GavelIcon from '@mui/icons-material/Gavel';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import WidgetsIcon from '@mui/icons-material/Widgets';
import { NavLink } from 'react-router-dom';

export const SIDEBAR_WIDTH = 240;

const items = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/agenda', label: 'Agenda', icon: <EventNoteIcon /> },
  { to: '/solicitacoes-visita', label: 'Solicitações', icon: <AssignmentIcon /> },
  { to: '/triagem', label: 'Triagem', icon: <GavelIcon /> },
  { to: '/planos-acao', label: 'Planos de ação', icon: <ListAltIcon /> },
  { to: '/assistidos', label: 'Assistidos', icon: <GroupIcon /> },
  { to: '/educadores', label: 'Educadores', icon: <SchoolIcon /> },
  { to: '/visitadores', label: 'Visitadores', icon: <DirectionsRunIcon /> },
  { to: '/configuracoes', label: 'Configurações', icon: <SettingsIcon /> },
  { to: '/auditoria', label: 'Auditoria', icon: <HistoryIcon /> },
  { to: '/showcase', label: 'Componentes', icon: <WidgetsIcon /> },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const variant = isMdUp ? 'persistent' : 'temporary';

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
      }}
      PaperProps={{ component: 'nav', 'aria-label': 'Menu principal' }}
    >
      <Toolbar />
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.to === '/'}
            onClick={() => !isMdUp && onClose()}
            sx={{
              '&.active': {
                bgcolor: 'action.selected',
                borderRight: (t) => `3px solid ${t.palette.primary.main}`,
                '& .MuiListItemIcon-root': { color: 'primary.main' },
                '& .MuiListItemText-primary': { fontWeight: 600 },
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
