import { useState } from 'react';
import {
  Button,
  Chip,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import WarningIcon from '@mui/icons-material/Warning';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DataTable,
  FilterPanel,
  PageHeader,
  SectionCard,
  StatusChip,
  type DataTableColumn,
} from '../../shared/ui';
import { triagemApi } from './api';
import type { FilaItem } from './types';
import {
  STATUS_LABEL,
  STATUS_MAPPING,
} from '../solicitacoes-visita/status-helpers';
import type { SolicitacaoStatus } from '../solicitacoes-visita/types';

const FILA_STATUSES: SolicitacaoStatus[] = ['ENVIADA_TRIAGEM', 'EM_TRIAGEM'];

export function TriagemListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | SolicitacaoStatus>('');
  const limit = 20;

  const fila = useQuery({
    queryKey: ['triagem', 'fila', { page, status }],
    queryFn: () => triagemApi.fila({ page, limit, status: status || undefined }),
  });

  const totalPages = fila.data ? Math.max(1, Math.ceil(fila.data.total / limit)) : 1;

  const columns: DataTableColumn<FilaItem>[] = [
    {
      id: 'prioridade',
      label: 'Prioridade',
      width: 140,
      render: (r) =>
        r.prioridade ? (
          <Chip
            label={`${r.prioridade.nome} (${r.prioridade.nivel})`}
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
    { id: 'assistido', label: 'Assistido', render: (r) => r.assistido?.nome ?? '—' },
    {
      id: 'motivo',
      label: 'Motivo principal',
      render: (r) => r.motivoPrincipal?.nome ?? '—',
    },
    {
      id: 'risco',
      label: 'Risco',
      align: 'center',
      width: 80,
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
      id: 'enviadaEm',
      label: 'Enviada em',
      render: (r) =>
        r.enviadaTriagemEm
          ? new Date(r.enviadaTriagemEm).toLocaleString('pt-BR')
          : '—',
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
        <Tooltip title="Abrir triagem">
          <IconButton
            color="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/triagem/${r.id}`);
            }}
            aria-label={`Abrir triagem de ${r.assistido?.nome ?? r.id}`}
          >
            <GavelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Triagem"
        subtitle="Solicitações pendentes de análise técnica"
        actions={
          <Button onClick={() => navigate('/solicitacoes-visita')}>
            Ver todas as solicitações
          </Button>
        }
      />

      <FilterPanel
        activeCount={status ? 1 : 0}
        onClear={() => {
          setStatus('');
          setPage(1);
        }}
      >
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | SolicitacaoStatus);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">
            <em>Pendentes (enviada e em triagem)</em>
          </MenuItem>
          {FILA_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </MenuItem>
          ))}
        </TextField>
      </FilterPanel>

      <SectionCard>
        <DataTable
          rows={fila.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={fila.isLoading}
          emptyMessage="Nenhuma solicitação pendente de triagem."
          ariaLabel="Fila de triagem"
          onRowClick={(r) => navigate(`/triagem/${r.id}`)}
        />
        {fila.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>
    </>
  );
}
