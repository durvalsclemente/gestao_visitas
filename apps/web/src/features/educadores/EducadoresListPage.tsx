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
import { educadoresApi } from './api';
import type { Educador, EducadorCargo } from './types';

const CARGO_LABEL: Record<EducadorCargo, string> = {
  EDUCADOR: 'Educador',
  COORDENADOR: 'Coordenador',
};

export function EducadoresListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cargo, setCargo] = useState<'' | EducadorCargo>('');
  const [ativo, setAtivo] = useState<'' | 'true' | 'false'>('');
  const [toRemove, setToRemove] = useState<Educador | null>(null);

  const limit = 20;
  const query = useQuery({
    queryKey: ['educadores', { page, search, cargo, ativo }],
    queryFn: () =>
      educadoresApi.list({
        page,
        limit,
        search: search || undefined,
        cargo: (cargo || undefined) as EducadorCargo | undefined,
        ativo: ativo === '' ? undefined : ativo === 'true',
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => educadoresApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['educadores'] }),
  });

  const activeFilters = [search, cargo, ativo].filter(Boolean).length;
  const clearFilters = () => {
    setSearch('');
    setCargo('');
    setAtivo('');
    setPage(1);
  };

  const columns: DataTableColumn<Educador>[] = [
    { id: 'nome', label: 'Nome', field: 'nome' },
    { id: 'cargo', label: 'Cargo', render: (r) => CARGO_LABEL[r.cargo] },
    { id: 'email', label: 'E-mail', render: (r) => r.email ?? '—' },
    { id: 'formacao', label: 'Formação', render: (r) => r.formacao ?? '—' },
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
                navigate(`/educadores/${r.id}`);
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
        title="Educadores e Coordenadores"
        subtitle="Equipe técnica vinculada à organização"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/educadores/novo')}>
            Novo educador
          </Button>
        }
      />

      <FilterPanel activeCount={activeFilters} onClear={clearFilters}>
        <TextField
          label="Buscar"
          placeholder="Nome, e-mail ou formação"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <TextField
          label="Cargo"
          select
          value={cargo}
          onChange={(e) => {
            setCargo(e.target.value as '' | EducadorCargo);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value=""><em>Todos</em></MenuItem>
          <MenuItem value="EDUCADOR">Educador</MenuItem>
          <MenuItem value="COORDENADOR">Coordenador</MenuItem>
        </TextField>
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
          emptyMessage="Nenhum educador cadastrado."
          ariaLabel="Lista de educadores"
          onRowClick={(r) => navigate(`/educadores/${r.id}`)}
        />
        {query.data && totalPages > 1 && (
          <Stack alignItems="flex-end" sx={{ mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
          </Stack>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir educador?"
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
