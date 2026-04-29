import { useState } from 'react';
import { Button, IconButton, Pagination, Stack, TextField, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConfirmDialog,
  DataTable,
  FilterPanel,
  PageHeader,
  SectionCard,
  type DataTableColumn,
} from '../../shared/ui';
import { assistidosApi } from './api';
import type { Assistido } from './types';

export function AssistidosListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cidade, setCidade] = useState('');
  const [toRemove, setToRemove] = useState<Assistido | null>(null);

  const limit = 20;
  const query = useQuery({
    queryKey: ['assistidos', { page, search, cidade }],
    queryFn: () =>
      assistidosApi.list({
        page,
        limit,
        search: search || undefined,
        cidade: cidade || undefined,
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => assistidosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assistidos'] }),
  });

  const activeFilters = [search, cidade].filter(Boolean).length;
  const clearFilters = () => {
    setSearch('');
    setCidade('');
    setPage(1);
  };

  const columns: DataTableColumn<Assistido>[] = [
    { id: 'nome', label: 'Nome', field: 'nome', sortable: false },
    { id: 'cpf', label: 'CPF', render: (r) => r.cpf ?? '—' },
    { id: 'cidade', label: 'Cidade', render: (r) => r.cidade ?? '—' },
    { id: 'telefone', label: 'Telefone', render: (r) => r.telefone ?? '—' },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Histórico 360º">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/assistidos/${r.id}/historico`);
              }}
              aria-label={`Histórico de ${r.nome}`}
            >
              <TimelineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/assistidos/${r.id}`);
              }}
              aria-label={`Editar ${r.nome}`}
            >
              <EditIcon fontSize="small" />
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
              aria-label={`Excluir ${r.nome}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / limit)) : 1;

  return (
    <>
      <PageHeader
        title="Assistidos"
        subtitle="Pessoas e famílias atendidas pela organização"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/assistidos/novo')}>
            Novo assistido
          </Button>
        }
      />

      <FilterPanel activeCount={activeFilters} onClear={clearFilters}>
        <TextField
          label="Buscar"
          placeholder="Nome, CPF ou e-mail"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <TextField
          label="Cidade"
          value={cidade}
          onChange={(e) => {
            setCidade(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 180 }}
        />
      </FilterPanel>

      <SectionCard>
        <DataTable
          rows={query.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={query.isLoading}
          emptyMessage="Nenhum assistido cadastrado."
          ariaLabel="Lista de assistidos"
          onRowClick={(r) => navigate(`/assistidos/${r.id}/historico`)}
        />
        {query.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir assistido?"
        message={
          toRemove
            ? `O registro de ${toRemove.nome} será marcado como removido.`
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
