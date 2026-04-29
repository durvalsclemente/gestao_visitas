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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
import { visitadoresApi } from './api';
import type { Visitador } from './types';

export function VisitadoresListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ativo, setAtivo] = useState<'' | 'true' | 'false'>('');
  const [toRemove, setToRemove] = useState<Visitador | null>(null);

  const limit = 20;
  const query = useQuery({
    queryKey: ['visitadores', { page, search, ativo }],
    queryFn: () =>
      visitadoresApi.list({
        page,
        limit,
        search: search || undefined,
        ativo: ativo === '' ? undefined : ativo === 'true',
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => visitadoresApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitadores'] }),
  });

  const activeFilters = [search, ativo].filter(Boolean).length;
  const clearFilters = () => {
    setSearch('');
    setAtivo('');
    setPage(1);
  };

  const columns: DataTableColumn<Visitador>[] = [
    { id: 'nome', label: 'Nome', field: 'nome' },
    { id: 'email', label: 'E-mail', render: (r) => r.email ?? '—' },
    { id: 'telefone', label: 'Telefone', render: (r) => r.telefone ?? '—' },
    {
      id: 'status',
      label: 'Status',
      render: (r) => (
        <Chip
          label={r.ativo ? 'Ativo' : 'Inativo'}
          color={r.ativo ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/visitadores/${r.id}`);
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
        title="Visitadores"
        subtitle="Profissionais que realizam as visitas"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/visitadores/novo')}>
            Novo visitador
          </Button>
        }
      />

      <FilterPanel activeCount={activeFilters} onClear={clearFilters}>
        <TextField
          label="Buscar"
          placeholder="Nome ou e-mail"
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
          value={ativo}
          onChange={(e) => {
            setAtivo(e.target.value as '' | 'true' | 'false');
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value=""><em>Todos</em></MenuItem>
          <MenuItem value="true">Ativos</MenuItem>
          <MenuItem value="false">Inativos</MenuItem>
        </TextField>
      </FilterPanel>

      <SectionCard>
        <DataTable
          rows={query.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          loading={query.isLoading}
          emptyMessage="Nenhum visitador cadastrado."
          ariaLabel="Lista de visitadores"
          onRowClick={(r) => navigate(`/visitadores/${r.id}`)}
        />
        {query.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir visitador?"
        message={toRemove ? `O registro de ${toRemove.nome} será marcado como removido.` : ''}
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
