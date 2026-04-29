import { useState } from 'react';
import { Box, Button, Grid, Stack, TextField } from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupIcon from '@mui/icons-material/Group';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useForm } from 'react-hook-form';
import {
  ConfirmDialog,
  DataTable,
  FilterPanel,
  FormCheckbox,
  FormDatePicker,
  FormFileUpload,
  FormSelect,
  FormTextField,
  PageHeader,
  PriorityChip,
  SectionCard,
  StatusChip,
  SummaryCard,
  type DataTableColumn,
} from '../../shared/ui';

interface VisitaDemo {
  id: string;
  beneficiario: string;
  data: string;
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA' | 'REAGENDADA';
  prioridade: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const ROWS: VisitaDemo[] = [
  { id: '1', beneficiario: 'Família Silva', data: '2026-04-28', status: 'AGENDADA', prioridade: 'HIGH' },
  { id: '2', beneficiario: 'Família Souza', data: '2026-04-22', status: 'REALIZADA', prioridade: 'MEDIUM' },
  { id: '3', beneficiario: 'João dos Santos', data: '2026-04-20', status: 'CANCELADA', prioridade: 'LOW' },
  { id: '4', beneficiario: 'Maria Oliveira', data: '2026-05-02', status: 'REAGENDADA', prioridade: 'CRITICAL' },
];

interface FormValues {
  nome: string;
  tipo: string;
  data: string;
  notificar: boolean;
  anexos: File[];
}

export function ShowcasePage() {
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { nome: '', tipo: '', data: '', notificar: false, anexos: [] },
  });

  const columns: DataTableColumn<VisitaDemo>[] = [
    { id: 'beneficiario', label: 'Beneficiário', field: 'beneficiario', sortable: true },
    { id: 'data', label: 'Data', field: 'data', sortable: true },
    { id: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    { id: 'prioridade', label: 'Prioridade', render: (r) => <PriorityChip priority={r.prioridade} /> },
  ];

  const filtered = ROWS.filter((r) =>
    r.beneficiario.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Componentes base"
        subtitle="Showcase visual dos componentes reutilizáveis"
        breadcrumbs={[{ label: 'Início', to: '/' }, { label: 'Componentes' }]}
        actions={
          <Button variant="contained" onClick={() => setConfirmOpen(true)}>
            Abrir confirmação
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard label="Visitas agendadas" value={12} icon={<EventNoteIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard label="Visitas realizadas" value={47} icon={<DoneAllIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard label="Pendentes" value={5} icon={<PendingActionsIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard label="Beneficiários" value={134} icon={<GroupIcon />} color="primary" />
        </Grid>
      </Grid>

      <FilterPanel activeCount={search ? 1 : 0} onClear={() => setSearch('')}>
        <TextField
          label="Buscar beneficiário"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
        />
      </FilterPanel>

      <SectionCard title="Visitas" subtitle="Tabela de exemplo">
        <DataTable
          rows={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          ariaLabel="Lista de visitas (demo)"
          onRowClick={(r) => console.log('row click', r)}
        />
      </SectionCard>

      <Box sx={{ mt: 3 }}>
        <SectionCard title="Formulário de exemplo" subtitle="Todos os FormFields integrados a react-hook-form">
          <Box component="form" onSubmit={handleSubmit((v) => console.log(v))}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormTextField name="nome" control={control} label="Nome" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormSelect
                  name="tipo"
                  control={control}
                  label="Tipo"
                  withEmptyOption
                  options={[
                    { value: 'INICIAL', label: 'Inicial' },
                    { value: 'ACOMPANHAMENTO', label: 'Acompanhamento' },
                    { value: 'ENCERRAMENTO', label: 'Encerramento' },
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormDatePicker name="data" control={control} label="Data agendada" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormCheckbox name="notificar" control={control} label="Notificar visitante por e-mail" />
              </Grid>
              <Grid item xs={12}>
                <FormFileUpload
                  name="anexos"
                  control={control}
                  label="Anexos"
                  accept="image/*,application/pdf"
                  multiple
                  maxSize={5 * 1024 * 1024}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button>Cancelar</Button>
                  <Button type="submit" variant="contained">
                    Salvar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </SectionCard>
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir visita?"
        message="Esta ação não pode ser desfeita. O registro será marcado como removido."
        tone="danger"
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
