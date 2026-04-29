import { useState } from 'react';
import {
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
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
import { solicitacoesApi } from './api';
import type { SolicitacaoStatus, SolicitacaoVisita } from './types';
import { STATUS_LABEL, STATUS_MAPPING } from './status-helpers';

const STATUSES: SolicitacaoStatus[] = [
  'RASCUNHO',
  'ENVIADA_TRIAGEM',
  'EM_TRIAGEM',
  'APROVADA',
  'REJEITADA',
  'CONVERTIDA_VISITA',
];

export function SolicitacoesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | SolicitacaoStatus>('');
  const [apenasMinhas, setApenasMinhas] = useState(false);
  const [toRemove, setToRemove] = useState<SolicitacaoVisita | null>(null);

  const limit = 20;
  const list = useQuery({
    queryKey: ['solicitacoes-visita', { page, search, status, apenasMinhas }],
    queryFn: () =>
      solicitacoesApi.list({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        apenasMinhas: apenasMinhas || undefined,
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => solicitacoesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitacoes-visita'] }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / limit)) : 1;
  const activeFilters = [search, status, apenasMinhas ? '1' : ''].filter(Boolean).length;
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setApenasMinhas(false);
    setPage(1);
  };

  const columns: DataTableColumn<SolicitacaoVisita>[] = [
    {
      id: 'assistido',
      label: 'Assistido',
      render: (r) => r.assistido?.nome ?? '—',
    },
    {
      id: 'motivo',
      label: 'Motivo principal',
      render: (r) => r.motivoPrincipal?.nome ?? '—',
    },
    {
      id: 'dataFatoGerador',
      label: 'Fato gerador',
      render: (r) =>
        r.dataFatoGerador
          ? new Date(r.dataFatoGerador).toLocaleDateString('pt-BR')
          : '—',
    },
    {
      id: 'prioridade',
      label: 'Prioridade',
      render: (r) =>
        r.prioridade ? (
          <Chip
            label={r.prioridade.nome}
            size="small"
            sx={{
              bgcolor: r.prioridade.cor ?? undefined,
              color: r.prioridade.cor ? '#fff' : undefined,
              fontWeight: 600,
            }}
          />
        ) : (
          '—'
        ),
    },
    {
      id: 'risco',
      label: 'Risco',
      render: (r) =>
        r.riscoImediato ? (
          <Tooltip title="Risco imediato">
            <WarningIcon color="error" fontSize="small" aria-label="Risco imediato" />
          </Tooltip>
        ) : (
          ''
        ),
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
      render: (r) => {
        const editable = r.status === 'RASCUNHO';
        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title={editable ? 'Editar' : 'Ver'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/solicitacoes-visita/${r.id}`);
                }}
                aria-label={`${editable ? 'Editar' : 'Ver'} solicitação de ${r.assistido?.nome ?? ''}`}
              >
                {editable ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {editable && (
              <Tooltip title="Excluir rascunho">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToRemove(r);
                  }}
                  aria-label="Excluir rascunho"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Solicitações de visita"
        subtitle="Pedidos de visita criados pela equipe técnica"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/solicitacoes-visita/novo')}
          >
            Nova solicitação
          </Button>
        }
      />

      <FilterPanel activeCount={activeFilters} onClear={clearFilters}>
        <TextField
          label="Buscar"
          placeholder="Assistido ou descrição"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <TextField
          label="Status"
          select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | SolicitacaoStatus);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 220 }}
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
              checked={apenasMinhas}
              onChange={(e) => {
                setApenasMinhas(e.target.checked);
                setPage(1);
              }}
            />
          }
          label="Apenas minhas"
        />
      </FilterPanel>

      <SectionCard>
        <DataTable
          rows={list.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          emptyMessage="Nenhuma solicitação registrada."
          ariaLabel="Lista de solicitações de visita"
          onRowClick={(r) => navigate(`/solicitacoes-visita/${r.id}`)}
        />
        {list.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir rascunho?"
        message={
          toRemove
            ? `O rascunho da solicitação para "${toRemove.assistido?.nome}" será marcado como removido.`
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
