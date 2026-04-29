import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import {
  DataTable,
  FilterPanel,
  PageHeader,
  SectionCard,
  StatusChip,
  type DataTableColumn,
} from '../../shared/ui';
import { visitadoresApi } from '../visitadores/api';
import { STATUS_LABEL, STATUS_MAPPING, visitasApi } from './api';
import type { Visita, VisitaStatus } from './types';

const STATUSES: VisitaStatus[] = ['AGENDADA', 'REALIZADA', 'CANCELADA', 'REAGENDADA'];

export function AgendaPage() {
  const navigate = useNavigate();

  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const in30 = useMemo(() => dayjs().add(30, 'day').format('YYYY-MM-DD'), []);

  const [page, setPage] = useState(1);
  const [de, setDe] = useState(today);
  const [ate, setAte] = useState(in30);
  const [visitadorId, setVisitadorId] = useState('');
  const [status, setStatus] = useState<'' | VisitaStatus>('');

  const visitadores = useQuery({
    queryKey: ['visitadores', 'select-agenda'],
    queryFn: () => visitadoresApi.list({ limit: 100, ativo: true }),
  });

  const limit = 50;
  const list = useQuery({
    queryKey: ['visitas', 'agenda', { page, de, ate, visitadorId, status }],
    queryFn: () =>
      visitasApi.agenda({
        page,
        limit,
        de: de || undefined,
        // Para "ate" inclusivo, somo um dia (o backend trata como `lt`).
        ate: ate ? dayjs(ate).add(1, 'day').format('YYYY-MM-DD') : undefined,
        visitadorId: visitadorId || undefined,
        status: status || undefined,
      }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / limit)) : 1;
  const activeFilters = [visitadorId, status].filter(Boolean).length;

  const grouped = useMemo(() => {
    const items = list.data?.items ?? [];
    const map = new Map<string, Visita[]>();
    for (const v of items) {
      const key = dayjs(v.dataAgendada).format('YYYY-MM-DD');
      const arr = map.get(key) ?? [];
      arr.push(v);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [list.data]);

  const columns: DataTableColumn<Visita>[] = [
    {
      id: 'hora',
      label: 'Hora',
      width: 80,
      render: (r) => dayjs(r.dataAgendada).format('HH:mm'),
    },
    { id: 'assistido', label: 'Assistido', render: (r) => r.assistido?.nome ?? '—' },
    {
      id: 'visitador',
      label: 'Visitador(es)',
      render: (r) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={r.visitador.nome} />
          {r.visitadorSecundario && (
            <Chip size="small" label={r.visitadorSecundario.nome} variant="outlined" />
          )}
        </Stack>
      ),
    },
    { id: 'tipo', label: 'Tipo', render: (r) => r.tipo },
    {
      id: 'duracao',
      label: 'Duração',
      render: (r) => (r.duracaoMinutos ? `${r.duracaoMinutos} min` : '—'),
    },
    {
      id: 'status',
      label: 'Status',
      render: (r) => <StatusChip status={r.status} mapping={STATUS_MAPPING} />,
    },
    {
      id: 'confirmada',
      label: 'Confirmada',
      align: 'center',
      render: (r) =>
        r.confirmadaEm ? (
          <Tooltip title={`Confirmada em ${dayjs(r.confirmadaEm).format('DD/MM HH:mm')}`}>
            <CheckCircleIcon color="success" fontSize="small" aria-label="Confirmada" />
          </Tooltip>
        ) : (
          ''
        ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Tooltip title="Abrir">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/visitas/${r.id}`);
            }}
            aria-label={`Abrir visita de ${r.assistido?.nome ?? r.id}`}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Agenda de visitas"
        subtitle={visitadorId ? 'Filtrada por visitador' : 'Visão geral da organização'}
      />

      <FilterPanel
        activeCount={activeFilters}
        onClear={() => {
          setVisitadorId('');
          setStatus('');
          setPage(1);
        }}
      >
        <TextField
          label="De"
          type="date"
          value={de}
          onChange={(e) => {
            setDe(e.target.value);
            setPage(1);
          }}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Até"
          type="date"
          value={ate}
          onChange={(e) => {
            setAte(e.target.value);
            setPage(1);
          }}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Visitador"
          value={visitadorId}
          onChange={(e) => {
            setVisitadorId(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value=""><em>Todos</em></MenuItem>
          {(visitadores.data?.items ?? []).map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.nome}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | VisitaStatus);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value=""><em>Todos</em></MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </MenuItem>
          ))}
        </TextField>
      </FilterPanel>

      {list.isLoading ? (
        <SectionCard>
          <Box sx={{ p: 3, textAlign: 'center' }}>Carregando…</Box>
        </SectionCard>
      ) : grouped.length === 0 ? (
        <SectionCard>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Nenhuma visita encontrada no período.
            </Typography>
          </Box>
        </SectionCard>
      ) : (
        <Stack spacing={2}>
          {grouped.map(([day, items]) => (
            <SectionCard
              key={day}
              title={dayjs(day).format('dddd, DD [de] MMMM [de] YYYY')}
              subtitle={`${items.length} visita${items.length > 1 ? 's' : ''}`}
            >
              <DataTable
                rows={items}
                columns={columns}
                getRowId={(r) => r.id}
                ariaLabel={`Visitas em ${day}`}
                onRowClick={(r) => navigate(`/visitas/${r.id}`)}
              />
            </SectionCard>
          ))}
        </Stack>
      )}

      {list.data && totalPages > 1 && (
        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      )}
    </>
  );
}
