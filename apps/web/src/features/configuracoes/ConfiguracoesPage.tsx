import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { PageHeader, SectionCard } from '../../shared/ui';
import { ProgramasPanel } from './panels/ProgramasPanel';
import {
  MotivosVisitaPanel,
  PrioridadesPanel,
  StatusPanel,
  TiposEncaminhamentoPanel,
} from './panels/SimpleLookupsPanels';
import { ParametrosPanel } from './panels/ParametrosPanel';

const TABS = [
  { id: 'programas', label: 'Programas', Component: ProgramasPanel },
  { id: 'motivos', label: 'Motivos de visita', Component: MotivosVisitaPanel },
  { id: 'encaminhamentos', label: 'Tipos de encaminhamento', Component: TiposEncaminhamentoPanel },
  { id: 'prioridades', label: 'Prioridades', Component: PrioridadesPanel },
  { id: 'status', label: 'Status', Component: StatusPanel },
  { id: 'parametros', label: 'Parâmetros', Component: ParametrosPanel },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ConfiguracoesPage() {
  const [active, setActive] = useState<TabId>('programas');
  const Active = TABS.find((t) => t.id === active)?.Component ?? ProgramasPanel;

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Cadastros auxiliares específicos da sua organização"
      />

      <SectionCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mx: -3, mt: -3 }}>
          <Tabs
            value={active}
            onChange={(_, v: TabId) => setActive(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Abas de configurações"
            sx={{ px: 2 }}
          >
            {TABS.map((t) => (
              <Tab key={t.id} value={t.id} label={t.label} />
            ))}
          </Tabs>
        </Box>

        <Box role="tabpanel" aria-label={TABS.find((t) => t.id === active)?.label}>
          <Active />
        </Box>
      </SectionCard>
    </>
  );
}
