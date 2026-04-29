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
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../shared/ui';
import { documentosApi, type DocumentoPayload } from './api';
import {
  ALLOWED_MIME_TYPES,
  DOCUMENTO_MAX_SIZE,
  SIGILO_LABEL,
  TIPO_LABEL,
  type Documento,
  type DocumentoParent,
  type NivelSigilo,
  type TipoDocumento,
} from './types';

const PARENT_FIELD: Record<DocumentoParent, keyof DocumentoPayload> = {
  assistido: 'assistidoId',
  solicitacao: 'solicitacaoId',
  visita: 'visitaId',
  relatorio: 'relatorioId',
  planoAcao: 'planoAcaoId',
};

interface DocumentosPanelProps {
  parent: DocumentoParent;
  parentId: string;
  /** Mostra título da seção. Default: oculto (assume que está dentro de outra `SectionCard`). */
  title?: string;
}

/**
 * Painel reutilizável de documentos vinculados a uma entidade
 * (assistido, solicitação, visita, relatório ou plano de ação).
 * Mostra lista filtrada pelo backend (que aplica regras de sigilo)
 * e oferece upload via dialog.
 */
export function DocumentosPanel({ parent, parentId, title }: DocumentosPanelProps) {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toRemove, setToRemove] = useState<Documento | null>(null);

  const queryKey = ['documentos', { parent, parentId }];
  const list = useQuery({
    queryKey,
    queryFn: () =>
      documentosApi.list({
        ...{ [PARENT_FIELD[parent]]: parentId },
        limit: 100,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => documentosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] }),
  });

  const items = list.data?.items ?? [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {title && (
          <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {title}
          </Typography>
        )}
        <Box sx={{ flexGrow: title ? 0 : 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
          Anexar documento
        </Button>
      </Stack>

      {list.isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Carregando…
        </Typography>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Nenhum documento anexado.
        </Typography>
      ) : (
        <List disablePadding>
          {items.map((d) => (
            <ListItem
              key={d.id}
              divider
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Ver/baixar">
                    <IconButton
                      size="small"
                      component={Link}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Baixar ${d.nome}`}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setToRemove(d)}
                      aria-label="Excluir documento"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
            >
              <ListItemIcon>
                <AttachFileIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {d.nome}
                    </Typography>
                    <Chip size="small" label={TIPO_LABEL[d.tipo]} variant="outlined" />
                    <SigiloChip sigilo={d.sigilo} />
                  </Stack>
                }
                secondary={
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Typography variant="caption" color="text.secondary">
                      {d.fileName} · {(d.tamanho / 1024).toFixed(1)} KB · {d.mimeType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enviado em {dayjs(d.uploadedAt).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      por {d.uploadedByExternalUserId.slice(0, 8)}…
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <UploadDialog
        open={uploadOpen}
        parent={parent}
        parentId={parentId}
        onClose={() => setUploadOpen(false)}
        onSaved={() => {
          setUploadOpen(false);
          qc.invalidateQueries({ queryKey: ['documentos'] });
        }}
      />

      <ConfirmDialog
        open={!!toRemove}
        title="Excluir documento?"
        message={
          toRemove
            ? `O documento "${toRemove.nome}" será marcado como removido.`
            : ''
        }
        tone="danger"
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={async () => {
          if (toRemove) await remove.mutateAsync(toRemove.id);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />
    </Box>
  );
}

function SigiloChip({ sigilo }: { sigilo: NivelSigilo }) {
  const tone =
    sigilo === 'CONFIDENCIAL' ? 'error' : sigilo === 'RESTRITO' ? 'warning' : 'default';
  const Icon = sigilo === 'PUBLICO' ? LockOpenIcon : LockIcon;
  return (
    <Chip
      size="small"
      icon={<Icon style={{ fontSize: 14 }} />}
      label={SIGILO_LABEL[sigilo]}
      color={tone}
      variant="filled"
    />
  );
}

// ---------- Upload dialog ----------

const TIPOS: TipoDocumento[] = [
  'IDENTIDADE',
  'COMPROVANTE_RESIDENCIA',
  'LAUDO_MEDICO',
  'LAUDO_PSICOLOGICO',
  'LAUDO_ASSISTENCIAL',
  'RELATORIO_TECNICO',
  'PARECER_JURIDICO',
  'PRONTUARIO',
  'AUTORIZACAO',
  'TERMO_CONSENTIMENTO',
  'FOTO',
  'OUTRO',
];

const SIGILOS: NivelSigilo[] = ['PUBLICO', 'RESTRITO', 'CONFIDENCIAL'];

interface UploadDialogProps {
  open: boolean;
  parent: DocumentoParent;
  parentId: string;
  onClose: () => void;
  onSaved: () => void;
}

function UploadDialog({ open, parent, parentId, onClose, onSaved }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>('OUTRO');
  const [sigilo, setSigilo] = useState<NivelSigilo>('RESTRITO');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setNome('');
      setTipo('OUTRO');
      setSigilo('RESTRITO');
      setDescricao('');
      setError(null);
    }
  }, [open]);

  const onPickFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > DOCUMENTO_MAX_SIZE) {
      setError(`Arquivo excede o limite de ${(DOCUMENTO_MAX_SIZE / 1024 / 1024).toFixed(0)} MB`);
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setError(`Tipo de arquivo não aceito: ${f.type}`);
      return;
    }
    setFile(f);
    if (!nome) setNome(f.name.replace(/\.[^.]+$/, ''));
  };

  const save = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Selecione um arquivo');
      // Pipeline real de upload virá em bloco específico. Por ora,
      // enviamos só metadata + URL placeholder.
      const placeholderUrl = `pending://${file.name}`;
      const payload: DocumentoPayload = {
        nome: nome || file.name,
        fileName: file.name,
        mimeType: file.type,
        tamanho: file.size,
        url: placeholderUrl,
        tipo,
        sigilo,
        descricao: descricao || undefined,
        [PARENT_FIELD[parent]]: parentId,
      };
      return documentosApi.create(payload);
    },
    onSuccess: onSaved,
    onError: (e: unknown) => {
      type ErrShape = { response?: { data?: { message?: string | string[] } } };
      const m = (e as ErrShape | null)?.response?.data?.message;
      setError(Array.isArray(m) ? m.join('; ') : (m ?? (e as Error).message));
    },
  });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Anexar documento</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info">
            Upload definitivo (S3/MinIO) será habilitado em bloco posterior. Por
            agora, o backend recebe os metadados; o conteúdo será sincronizado depois.
          </Alert>

          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFileIcon />}
            >
              Selecionar arquivo
              <input
                type="file"
                hidden
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            {file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {file.name} · {(file.size / 1024).toFixed(1)} KB · {file.type}
              </Typography>
            )}
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              Tipos aceitos: PDF, DOC(X), XLS(X), JPG, PNG, WEBP, HEIC, TXT, CSV.
              Máx. {(DOCUMENTO_MAX_SIZE / 1024 / 1024).toFixed(0)} MB.
            </Typography>
          </Box>

          <TextField
            label="Título do documento"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDocumento)}
              fullWidth
            >
              {TIPOS.map((t) => (
                <MenuItem key={t} value={t}>
                  {TIPO_LABEL[t]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Sigilo"
              value={sigilo}
              onChange={(e) => setSigilo(e.target.value as NivelSigilo)}
              fullWidth
            >
              {SIGILOS.map((s) => (
                <MenuItem key={s} value={s}>
                  {SIGILO_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Descrição (opcional)"
            multiline
            minRows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!file || !nome || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Enviando…' : 'Anexar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
