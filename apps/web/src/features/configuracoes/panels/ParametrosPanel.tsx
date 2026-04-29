import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConfirmDialog,
  DataTable,
  FilterPanel,
  type DataTableColumn,
} from '../../../shared/ui';
import { parametrosApi, type ParametroApp, type ParametroForm } from '../api';

interface FormState {
  chave: string;
  valorJson: string;
  descricao: string;
  categoria: string;
}

const EMPTY: FormState = { chave: '', valorJson: '""', descricao: '', categoria: '' };

export function ParametrosPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [editing, setEditing] = useState<ParametroApp | null | 'new'>(null);
  const [toRemove, setToRemove] = useState<ParametroApp | null>(null);

  const limit = 50;
  const list = useQuery({
    queryKey: ['parametros', { page, search, categoria }],
    queryFn: () =>
      parametrosApi.list({
        page,
        limit,
        search: search || undefined,
        categoria: categoria || undefined,
      }),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / limit)) : 1;

  const removeMutation = useMutation({
    mutationFn: (id: string) => parametrosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parametros'] }),
  });

  const columns: DataTableColumn<ParametroApp>[] = [
    { id: 'chave', label: 'Chave', render: (r) => <Typography fontFamily="monospace">{r.chave}</Typography> },
    {
      id: 'categoria',
      label: 'Categoria',
      render: (r) => (r.categoria ? <Chip label={r.categoria} size="small" /> : '—'),
    },
    {
      id: 'valor',
      label: 'Valor',
      render: (r) => (
        <Typography
          variant="body2"
          fontFamily="monospace"
          sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {JSON.stringify(r.valor)}
        </Typography>
      ),
    },
    { id: 'descricao', label: 'Descrição', render: (r) => r.descricao ?? '—' },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => setEditing(r)} aria-label={`Editar ${r.chave}`}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="error"
              onClick={() => setToRemove(r)}
              aria-label={`Excluir ${r.chave}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const activeFilters = [search, categoria].filter(Boolean).length;

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
          Novo parâmetro
        </Button>
      </Stack>

      <FilterPanel
        activeCount={activeFilters}
        onClear={() => {
          setSearch('');
          setCategoria('');
          setPage(1);
        }}
      >
        <TextField
          label="Buscar"
          placeholder="Chave ou descrição"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <TextField
          label="Categoria"
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value);
            setPage(1);
          }}
          size="small"
          sx={{ minWidth: 180 }}
        />
      </FilterPanel>

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        getRowId={(r) => r.id}
        loading={list.isLoading}
        emptyMessage="Nenhum parâmetro configurado."
        ariaLabel="Lista de parâmetros do app"
      />

      {list.data && totalPages > 1 && (
        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Stack>
      )}

      <ParametroDialog
        open={editing !== null}
        editing={editing && editing !== 'new' ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['parametros'] });
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir parâmetro?"
        message={
          toRemove
            ? `O parâmetro "${toRemove.chave}" será excluído permanentemente. Aplicações que o consomem perderão a configuração.`
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
    </Box>
  );
}

interface DialogProps {
  open: boolean;
  editing: ParametroApp | null;
  onClose: () => void;
  onSaved: () => void;
}

function ParametroDialog({ open, editing, onClose, onSaved }: DialogProps) {
  const [state, setState] = useState<FormState>(EMPTY);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setState({
        chave: editing.chave,
        valorJson: JSON.stringify(editing.valor, null, 2),
        descricao: editing.descricao ?? '',
        categoria: editing.categoria ?? '',
      });
    } else {
      setState(EMPTY);
    }
    setJsonError(null);
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      let valor: unknown;
      try {
        valor = JSON.parse(state.valorJson);
      } catch (e) {
        throw new Error(`JSON inválido: ${(e as Error).message}`);
      }
      const payload: ParametroForm = {
        chave: state.chave,
        valor,
        descricao: state.descricao || undefined,
        categoria: state.categoria || undefined,
      };
      if (editing) {
        return parametrosApi.update(editing.id, payload);
      }
      return parametrosApi.create(payload);
    },
    onSuccess: onSaved,
    onError: (e) => setJsonError((e as Error).message),
  });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Editar parâmetro' : 'Novo parâmetro'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Chave"
            required
            value={state.chave}
            onChange={(e) => setState((s) => ({ ...s, chave: e.target.value }))}
            disabled={!!editing}
            helperText="Use letras minúsculas, números, ponto, hífen ou underline. Imutável após criação."
            inputProps={{ pattern: '[a-z0-9_.\\-]+' }}
          />
          <TextField
            label="Categoria"
            value={state.categoria}
            onChange={(e) => setState((s) => ({ ...s, categoria: e.target.value }))}
            placeholder="ex.: agenda, notificacoes"
          />
          <TextField
            label="Descrição"
            value={state.descricao}
            onChange={(e) => setState((s) => ({ ...s, descricao: e.target.value }))}
            multiline
            minRows={2}
          />
          <TextField
            label="Valor (JSON)"
            required
            value={state.valorJson}
            onChange={(e) => setState((s) => ({ ...s, valorJson: e.target.value }))}
            multiline
            minRows={4}
            error={!!jsonError}
            helperText={jsonError ?? 'string, number, boolean, array ou objeto JSON.'}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          {save.isError && !jsonError && (
            <Alert severity="error">Falha ao salvar parâmetro.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
