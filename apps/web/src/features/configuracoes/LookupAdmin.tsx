import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useForm, type DefaultValues } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConfirmDialog,
  DataTable,
  FilterPanel,
  type DataTableColumn,
} from '../../shared/ui';
import type { Paginated } from '../../shared/api/types';

export interface LookupItemBase {
  id: string;
  nome: string;
  ativo?: boolean;
}

interface CrudClient<T, F> {
  list: (q: { page?: number; limit?: number; search?: string; ativo?: boolean }) => Promise<Paginated<T>>;
  create: (payload: F) => Promise<T>;
  update: (id: string, payload: Partial<F>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

interface LookupAdminProps<T extends LookupItemBase, F extends Record<string, unknown>> {
  /** Chave de cache do React Query (ex.: ['motivos-visita']). */
  queryKey: string;
  /** Cliente CRUD criado com makeCrud(). */
  client: CrudClient<T, F>;
  /** Valor inicial do formulário (campos em branco). */
  emptyValues: DefaultValues<F>;
  /** Renderiza colunas extras na tabela (depois de "Nome"). */
  extraColumns?: DataTableColumn<T>[];
  /** Renderiza inputs do formulário. Recebe o `control` do react-hook-form. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderFormFields: (ctx: { control: any }) => ReactNode;
  /** Mapeia o item da API para os defaultValues do form (ao editar). */
  toFormValues: (item: T) => F;
  /** Texto de "novo / editar" (ex.: "motivo de visita"). */
  entityLabel: string;
  /** Mensagem do empty state. */
  emptyMessage?: string;
  /** Mostra filtro "ativo/inativo". */
  withAtivoFilter?: boolean;
}

export function LookupAdmin<T extends LookupItemBase, F extends Record<string, unknown>>({
  queryKey,
  client,
  emptyValues,
  extraColumns = [],
  renderFormFields,
  toFormValues,
  entityLabel,
  emptyMessage,
  withAtivoFilter = true,
}: LookupAdminProps<T, F>) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ativo, setAtivo] = useState<'' | 'true' | 'false'>('');
  const [editing, setEditing] = useState<T | null | 'new'>(null);
  const [toRemove, setToRemove] = useState<T | null>(null);

  const limit = 50;
  const list = useQuery({
    queryKey: [queryKey, { page, search, ativo }],
    queryFn: () =>
      client.list({
        page,
        limit,
        search: search || undefined,
        ativo: ativo === '' ? undefined : ativo === 'true',
      }),
  });

  const save = useMutation({
    mutationFn: async (values: F) => {
      const cleaned = removeEmpty(values);
      if (editing && editing !== 'new') {
        return client.update(editing.id, cleaned);
      }
      return client.create(cleaned);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      setEditing(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / limit)) : 1;
  const activeFilters = [search, ativo].filter(Boolean).length;

  const columns: DataTableColumn<T>[] = [
    { id: 'nome', label: 'Nome', field: 'nome' },
    ...extraColumns,
    ...(withAtivoFilter
      ? [
          {
            id: 'status',
            label: 'Status',
            render: (r: T) => (
              <Chip
                label={r.ativo ? 'Ativo' : 'Inativo'}
                color={r.ativo ? 'success' : 'default'}
                size="small"
              />
            ),
          } as DataTableColumn<T>,
        ]
      : []),
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => setEditing(r)}
              aria-label={`Editar ${r.nome}`}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="error"
              onClick={() => setToRemove(r)}
              aria-label={`Excluir ${r.nome}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
          Novo {entityLabel}
        </Button>
      </Stack>

      <FilterPanel
        activeCount={activeFilters}
        onClear={() => {
          setSearch('');
          setAtivo('');
          setPage(1);
        }}
      >
        <TextField
          label="Buscar"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 240 }}
        />
        {withAtivoFilter && (
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
        )}
      </FilterPanel>

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        loading={list.isLoading}
        emptyMessage={emptyMessage ?? `Nenhum ${entityLabel} cadastrado.`}
        ariaLabel={`Lista de ${entityLabel}s`}
      />
      {list.data && totalPages > 1 && (
        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      )}

      <FormDialog
        open={editing !== null}
        title={editing && editing !== 'new' ? `Editar ${entityLabel}` : `Novo ${entityLabel}`}
        defaultValues={editing && editing !== 'new' ? (toFormValues(editing) as F) : (emptyValues as F)}
        onCancel={() => setEditing(null)}
        onSubmit={(v) => save.mutate(v)}
        renderFields={renderFormFields}
        loading={save.isPending}
        errorMessage={save.isError ? 'Falha ao salvar.' : undefined}
      />

      <ConfirmDialog
        open={!!toRemove}
        title={`Excluir ${entityLabel}?`}
        message={toRemove ? `O registro "${toRemove.nome}" será marcado como removido.` : ''}
        tone="danger"
        confirmLabel="Excluir"
        loading={removeMutation.isPending}
        onConfirm={async () => {
          if (toRemove) await removeMutation.mutateAsync(toRemove.id);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />
    </Box>
  );
}

interface FormDialogProps<F extends Record<string, unknown>> {
  open: boolean;
  title: string;
  defaultValues: F;
  loading: boolean;
  errorMessage?: string;
  onSubmit: (values: F) => void;
  onCancel: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderFields: (ctx: { control: any }) => ReactNode;
}

function FormDialog<F extends Record<string, unknown>>({
  open,
  title,
  defaultValues,
  loading,
  errorMessage,
  onSubmit,
  onCancel,
  renderFields,
}: FormDialogProps<F>) {
  const { control, handleSubmit, reset } = useForm<F>({
    defaultValues: defaultValues as DefaultValues<F>,
  });

  // A cada abertura, força o form a refletir os defaultValues (criar vs editar).
  useEffect(() => {
    if (open) reset(defaultValues as DefaultValues<F>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((v) => onSubmit(v))}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {renderFields({ control })}
            {errorMessage && (
              <Box sx={{ color: 'error.main', fontSize: 14 }}>{errorMessage}</Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function removeEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== '' && v !== undefined && v !== null) out[k] = v;
  }
  return out as T;
}
