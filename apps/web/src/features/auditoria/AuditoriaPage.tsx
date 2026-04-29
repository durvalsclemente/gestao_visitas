import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Pagination,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import {
  DataTable,
  FilterPanel,
  PageHeader,
  SectionCard,
  type DataTableColumn,
} from '../../shared/ui';
import { auditoriaApi, type AuditLogItem } from './api';

export function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [externalUserId, setExternalUserId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 50;
  const list = useQuery({
    queryKey: ['audit', { page, from, to, entity, action, externalUserId }],
    queryFn: () =>
      auditoriaApi.list({
        page,
        limit,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
        entity: entity || undefined,
        action: action || undefined,
        externalUserId: externalUserId || undefined,
      }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / limit)) : 1;
  const activeFilters = [entity, action, externalUserId].filter(Boolean).length;

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      id: 'expand',
      label: '',
      width: 40,
      render: (r) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === r.id ? null : r.id);
          }}
          aria-label={expandedId === r.id ? 'Recolher' : 'Expandir'}
        >
          {expandedId === r.id ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      ),
    },
    {
      id: 'occurredAt',
      label: 'Quando',
      width: 160,
      render: (r) => dayjs(r.occurredAt).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      id: 'action',
      label: 'Ação',
      render: (r) => <Chip size="small" label={r.action} variant="outlined" />,
    },
    { id: 'entity', label: 'Entidade', render: (r) => r.entity ?? '—' },
    {
      id: 'entityId',
      label: 'ID do registro',
      render: (r) =>
        r.entityId ? (
          <Tooltip title={r.entityId}>
            <Typography variant="body2" fontFamily="monospace">
              {r.entityId.slice(0, 8)}…
            </Typography>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      id: 'externalUserId',
      label: 'Autor (externalUserId)',
      render: (r) =>
        r.externalUserId ? (
          <Tooltip title={r.externalUserId}>
            <Typography variant="body2" fontFamily="monospace">
              {r.externalUserId.slice(0, 8)}…
            </Typography>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      id: 'ip',
      label: 'IP',
      render: (r) => r.ip ?? '—',
    },
  ];

  return (
    <>
      <PageHeader
        title="Auditoria"
        subtitle="Trail de operações da organização — cruzável com a Central de Acessos via externalUserId"
      />

      {list.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Falha ao carregar trilha de auditoria.
        </Alert>
      )}

      <FilterPanel
        activeCount={activeFilters}
        onClear={() => {
          setEntity('');
          setAction('');
          setExternalUserId('');
          setPage(1);
        }}
      >
        <TextField
          label="De"
          type="date"
          size="small"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Até"
          type="date"
          size="small"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Entidade"
          size="small"
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          placeholder="Ex.: Assistido"
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Ação"
          size="small"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          placeholder="Ex.: create"
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Usuário (externalUserId)"
          size="small"
          value={externalUserId}
          onChange={(e) => {
            setExternalUserId(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 260 }}
        />
      </FilterPanel>

      <SectionCard>
        <DataTable
          rows={list.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          emptyMessage="Nenhum evento de auditoria no período."
          ariaLabel="Trail de auditoria"
        />
        {expandedId &&
          list.data?.items
            .filter((r) => r.id === expandedId)
            .map((r) => (
              <Box
                key={r.id}
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={`Action: ${r.action}`} />
                  {r.entity && <Chip size="small" label={`Entity: ${r.entity}`} />}
                  {r.entityId && (
                    <Chip
                      size="small"
                      label={`ID: ${r.entityId.slice(0, 12)}…`}
                      variant="outlined"
                    />
                  )}
                  {r.userAgent && (
                    <Chip size="small" label={r.userAgent.slice(0, 60)} variant="outlined" />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  meta (JSON):
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    margin: 0,
                    p: 1.5,
                    bgcolor: '#0F172A',
                    color: '#E5E7EB',
                    borderRadius: 1,
                    fontSize: 12,
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(r.meta ?? {}, null, 2)}
                </Box>
              </Box>
            ))}
        {list.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>
    </>
  );
}
