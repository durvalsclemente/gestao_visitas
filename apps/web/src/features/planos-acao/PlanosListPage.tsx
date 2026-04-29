import { useState } from 'react';
import {
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConfirmDialog,
  DataTable,
  FilterPanel,
  PageHeader,
  SectionCard,
  StatusChip,
  type DataTableColumn,
} from '../../shared/ui';
import { planosApi, STATUS_LABEL, STATUS_MAPPING } from './api';
import type { PlanoAcao, PlanoAcaoStatus } from './types';

const STATUSES: PlanoAcaoStatus[] = [
  'RASCUNHO',
  'ATIVO',
  'EM_REVISAO',
  'CONCLUIDO',
  'CANCELADO',
];

export function PlanosListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | PlanoAcaoStatus>('');
  const [apenasMeus, setApenasMeus] = useState(false);
  const [toRemove, setToRemove] = useState<PlanoAcao | null>(null);

  const limit = 20;
  const list = useQuery({
    queryKey: ['planos-acao', { page, search, status, apenasMeus }],
    queryFn: () =>
      planosApi.list({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        apenasMeus: apenasMeus || undefined,
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => planosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos-acao'] }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / limit)) : 1;
  const activeFilters = [search, status, apenasMeus ? '1' : ''].filter(Boolean).length;

  const columns: DataTableColumn<PlanoAcao>[] = [
    { id: 'assistido', label: 'Assistido', render: (r) => r.assistido?.nome ?? '—' },
    {
      id: 'objetivo',
      label: 'Objetivo',
      render: (r) => (
        <Typography
          variant="body2"
          sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {r.objetivo}
        </Typography>
      ),
    },
    { id: 'area', label: 'Área', render: (r) => r.areaResponsavel ?? '—' },
    {
      id: 'prazo',
      label: 'Prazo',
      render: (r) => (r.prazo ? dayjs(r.prazo).format('DD/MM/YYYY') : '—'),
    },
    {
      id: 'status',
      label: 'Status',
      render: (r) => <StatusChip status={r.status} mapping={STATUS_MAPPING} />,
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Abrir">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/planos-acao/${r.id}`);
              }}
              aria-label={`Abrir plano de ${r.assistido?.nome ?? r.id}`}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setToRemove(r);
              }}
              aria-label="Excluir plano"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Planos de ação"
        subtitle="Acompanhamento dos casos com plano estruturado"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/planos-acao/novo')}
          >
            Novo plano
          </Button>
        }
      />

      <FilterPanel
        activeCount={activeFilters}
        onClear={() => {
          setSearch('');
          setStatus('');
          setApenasMeus(false);
          setPage(1);
        }}
      >
        <TextField
          label="Buscar"
          placeholder="Assistido, objetivo ou problema"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 260 }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | PlanoAcaoStatus);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value=""><em>Todos</em></MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Switch
              checked={apenasMeus}
              onChange={(e) => {
                setApenasMeus(e.target.checked);
                setPage(1);
              }}
            />
          }
          label="Apenas em que sou responsável"
        />
      </FilterPanel>

      <SectionCard>
        <DataTable
          rows={list.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          emptyMessage="Nenhum plano de ação cadastrado."
          ariaLabel="Lista de planos de ação"
          onRowClick={(r) => navigate(`/planos-acao/${r.id}`)}
        />
        {list.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir plano de ação?"
        message={
          toRemove
            ? `O plano "${toRemove.objetivo.slice(0, 80)}…" será marcado como removido.`
            : ''
        }
        tone="danger"
        confirmLabel="Excluir"
        loading={removeMutation.isPending}
        onConfirm={async () => {
          if (toRemove) await removeMutation.mutateAsync(toRemove.id);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />
    </>
  );
}
