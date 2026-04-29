import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TimelineIcon from '@mui/icons-material/Timeline';
import EventIcon from '@mui/icons-material/Event';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagCircleIcon from '@mui/icons-material/FlagCircle';
import dayjs from 'dayjs';
import { PageHeader, SectionCard, StatusChip } from '../../shared/ui';
import { planosApi, STATUS_MAPPING } from './api';
import { DocumentosPanel } from '../documentos/DocumentosPanel';
import type {
  AcaoPlano,
  AcompanhamentoPlano,
  PlanoAcao,
} from './types';

interface TimelineEvent {
  id: string;
  at: string;
  kind: 'created' | 'acao' | 'acao_done' | 'acompanhamento';
  title: string;
  description?: string;
  badge?: string;
  icon: React.ReactNode;
}

export function PlanoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['planos-acao', id],
    queryFn: () => planosApi.get(id!),
    enabled: !!id,
  });

  const [acaoDialogOpen, setAcaoDialogOpen] = useState(false);
  const [acompDialogOpen, setAcompDialogOpen] = useState(false);

  if (detail.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (detail.isError || !detail.data) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Plano de ação não encontrado.
      </Alert>
    );
  }

  const p = detail.data;
  const editavel = p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO';

  return (
    <>
      <PageHeader
        title="Plano de ação"
        subtitle={p.assistido.nome}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Planos de ação', to: '/planos-acao' },
          { label: p.assistido.nome },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <StatusChip status={p.status} mapping={STATUS_MAPPING} />
            <Button
              startIcon={<EditIcon />}
              onClick={() => navigate(`/planos-acao/${p.id}/editar`)}
            >
              Editar
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <SectionCard title="Caso">
            <Stack spacing={1}>
              <Field label="Assistido" value={p.assistido.nome} />
              {p.assistido.cpf && <Field label="CPF" value={p.assistido.cpf} />}
              <Field label="Área responsável" value={p.areaResponsavel ?? '—'} />
              <Field
                label="Prazo"
                value={p.prazo ? dayjs(p.prazo).format('DD/MM/YYYY') : '—'}
              />
              <Field
                label="Data de revisão"
                value={p.dataRevisao ? dayjs(p.dataRevisao).format('DD/MM/YYYY') : '—'}
              />
              <Field
                label="Indicador de sucesso"
                value={p.indicadorSucesso ?? '—'}
                block
              />
              <Field
                label="Responsáveis"
                value={
                  p.responsaveisExternalUserIds.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {p.responsaveisExternalUserIds.map((u) => (
                        <Chip key={u} size="small" label={u} variant="outlined" />
                      ))}
                    </Stack>
                  ) : (
                    '—'
                  )
                }
              />
            </Stack>
          </SectionCard>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Objetivo">
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {p.objetivo}
              </Typography>
            </SectionCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Problema principal">
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {p.problemaPrincipal}
              </Typography>
            </SectionCard>
          </Box>
        </Grid>

        <Grid item xs={12} md={7}>
          <SectionCard
            title={`Ações (${p.acoes?.length ?? 0})`}
            actions={
              editavel && (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAcaoDialogOpen(true)}
                >
                  Adicionar
                </Button>
              )
            }
          >
            <AcoesList
              planoId={p.id}
              acoes={p.acoes ?? []}
              editavel={editavel}
              onChanged={() => qc.invalidateQueries({ queryKey: ['planos-acao', id] })}
            />
          </SectionCard>

          <Box sx={{ mt: 2 }}>
            <SectionCard
              title="Acompanhamento e timeline"
              actions={
                editavel && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<TimelineIcon />}
                    onClick={() => setAcompDialogOpen(true)}
                  >
                    Registrar acompanhamento
                  </Button>
                )
              }
            >
              <Timeline plano={p} />
            </SectionCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Documentos do plano">
              <DocumentosPanel parent="planoAcao" parentId={p.id} />
            </SectionCard>
          </Box>
        </Grid>
      </Grid>

      <AcaoDialog
        open={acaoDialogOpen}
        onClose={() => setAcaoDialogOpen(false)}
        onSaved={() => {
          setAcaoDialogOpen(false);
          qc.invalidateQueries({ queryKey: ['planos-acao', id] });
        }}
        planoId={p.id}
      />

      <AcompanhamentoDialog
        open={acompDialogOpen}
        onClose={() => setAcompDialogOpen(false)}
        onSaved={() => {
          setAcompDialogOpen(false);
          qc.invalidateQueries({ queryKey: ['planos-acao', id] });
          qc.invalidateQueries({ queryKey: ['planos-acao'] });
        }}
        planoId={p.id}
      />
    </>
  );
}

// ---------- Lista de ações ----------

function AcoesList({
  planoId,
  acoes,
  editavel,
  onChanged,
}: {
  planoId: string;
  acoes: AcaoPlano[];
  editavel: boolean;
  onChanged: () => void;
}) {
  const toggle = useMutation({
    mutationFn: ({ acaoId, concluida }: { acaoId: string; concluida: boolean }) =>
      planosApi.updateAcao(planoId, acaoId, { concluida }),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: (acaoId: string) => planosApi.removeAcao(planoId, acaoId),
    onSuccess: onChanged,
  });

  if (acoes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Nenhuma ação cadastrada ainda.
      </Typography>
    );
  }

  return (
    <List disablePadding>
      {acoes.map((a) => (
        <ListItem
          key={a.id}
          divider
          secondaryAction={
            editavel && (
              <Tooltip title="Remover ação">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => remove.mutate(a.id)}
                  aria-label="Remover ação"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )
          }
        >
          <ListItemIcon>
            <Checkbox
              checked={a.concluida}
              disabled={!editavel || toggle.isPending}
              onChange={(e) =>
                toggle.mutate({ acaoId: a.id, concluida: e.target.checked })
              }
              inputProps={{ 'aria-label': `Concluir ação ${a.descricao}` }}
            />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                sx={{
                  textDecoration: a.concluida ? 'line-through' : 'none',
                  color: a.concluida ? 'text.disabled' : 'text.primary',
                }}
              >
                {a.descricao}
              </Typography>
            }
            secondary={
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {a.prazo && (
                  <Chip
                    size="small"
                    label={`Prazo: ${dayjs(a.prazo).format('DD/MM/YYYY')}`}
                    variant="outlined"
                  />
                )}
                {a.responsavelExternalUserId && (
                  <Chip
                    size="small"
                    label={`Resp.: ${a.responsavelExternalUserId.slice(0, 8)}…`}
                    variant="outlined"
                  />
                )}
                {a.concluidaEm && (
                  <Chip
                    size="small"
                    color="success"
                    label={`Concluída em ${dayjs(a.concluidaEm).format('DD/MM HH:mm')}`}
                  />
                )}
              </Stack>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}

// ---------- Timeline ----------

function Timeline({ plano }: { plano: PlanoAcao }) {
  const events = useMemo(() => buildTimeline(plano), [plano]);

  if (events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Sem eventos registrados.
      </Typography>
    );
  }

  return (
    <Box sx={{ position: 'relative', pl: 4 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 11,
          top: 8,
          bottom: 8,
          width: 2,
          bgcolor: 'divider',
        }}
      />
      <Stack spacing={2.5}>
        {events.map((e) => (
          <Box key={e.id} sx={{ position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                left: -28,
                top: 2,
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
              }}
            >
              {e.icon}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                {dayjs(e.at).format('DD/MM/YYYY HH:mm')}
              </Typography>
              {e.badge && <Chip size="small" label={e.badge} variant="outlined" />}
            </Stack>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.25 }}>
              {e.title}
            </Typography>
            {e.description && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                {e.description}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function buildTimeline(plano: PlanoAcao): TimelineEvent[] {
  const out: TimelineEvent[] = [];

  out.push({
    id: `created-${plano.id}`,
    at: plano.createdAt,
    kind: 'created',
    title: 'Plano criado',
    description: plano.objetivo,
    icon: <FlagCircleIcon fontSize="small" />,
  });

  for (const a of plano.acoes ?? []) {
    out.push({
      id: `acao-${a.id}`,
      at: a.createdAt,
      kind: 'acao',
      title: 'Ação adicionada',
      description: a.descricao,
      badge: a.responsavelExternalUserId ? `Resp.: ${a.responsavelExternalUserId.slice(0, 8)}…` : undefined,
      icon: <AssignmentTurnedInIcon fontSize="small" />,
    });
    if (a.concluidaEm) {
      out.push({
        id: `acao-done-${a.id}`,
        at: a.concluidaEm,
        kind: 'acao_done',
        title: 'Ação concluída',
        description: a.descricao,
        icon: <CheckCircleIcon fontSize="small" />,
      });
    }
  }

  for (const c of plano.acompanhamentos ?? []) {
    const tags: string[] = [];
    if (c.necessitaNovaVisita) tags.push('nova visita');
    if (c.encerraCaso) tags.push('encerramento');
    out.push({
      id: `acomp-${c.id}`,
      at: c.createdAt,
      kind: 'acompanhamento',
      title: 'Acompanhamento registrado',
      description: [
        c.evolucao,
        c.dificuldades && `Dificuldades: ${c.dificuldades}`,
        c.proximosPassos && `Próximos passos: ${c.proximosPassos}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      badge: tags.length ? tags.join(' · ') : undefined,
      icon: <EventIcon fontSize="small" />,
    });
  }

  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ---------- Dialogs ----------

function AcaoDialog({
  open,
  onClose,
  onSaved,
  planoId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  planoId: string;
}) {
  const [descricao, setDescricao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [prazo, setPrazo] = useState('');

  const save = useMutation({
    mutationFn: () =>
      planosApi.addAcao(planoId, {
        descricao,
        responsavelExternalUserId: responsavel || undefined,
        prazo: prazo || undefined,
      }),
    onSuccess: () => {
      setDescricao('');
      setResponsavel('');
      setPrazo('');
      onSaved();
    },
  });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nova ação</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Descrição"
            multiline
            minRows={2}
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <TextField
            label="Responsável (externalUserId)"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            helperText="UUID do usuário da Central. Opcional."
          />
          <TextField
            label="Prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={descricao.trim().length < 3 || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Salvando…' : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AcompanhamentoDialog({
  open,
  onClose,
  onSaved,
  planoId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  planoId: string;
}) {
  const [evolucao, setEvolucao] = useState('');
  const [dificuldades, setDificuldades] = useState('');
  const [proximosPassos, setProximosPassos] = useState('');
  const [necessitaNovaVisita, setNecessitaNovaVisita] = useState(false);
  const [encerraCaso, setEncerraCaso] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      planosApi.registrarAcompanhamento(planoId, {
        evolucao,
        dificuldades: dificuldades || undefined,
        proximosPassos: proximosPassos || undefined,
        necessitaNovaVisita,
        encerraCaso,
      }),
    onSuccess: () => {
      setEvolucao('');
      setDificuldades('');
      setProximosPassos('');
      setNecessitaNovaVisita(false);
      setEncerraCaso(false);
      onSaved();
    },
  });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Registrar acompanhamento</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Evolução *"
            multiline
            minRows={3}
            required
            value={evolucao}
            onChange={(e) => setEvolucao(e.target.value)}
            helperText="Mínimo 5 caracteres."
          />
          <TextField
            label="Dificuldades"
            multiline
            minRows={2}
            value={dificuldades}
            onChange={(e) => setDificuldades(e.target.value)}
          />
          <TextField
            label="Próximos passos"
            multiline
            minRows={2}
            value={proximosPassos}
            onChange={(e) => setProximosPassos(e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={necessitaNovaVisita}
                onChange={(e) => setNecessitaNovaVisita(e.target.checked)}
              />
            }
            label="Solicitar nova visita"
          />
          <FormControlLabel
            control={
              <Switch
                checked={encerraCaso}
                onChange={(e) => setEncerraCaso(e.target.checked)}
              />
            }
            label="Encerrar caso (plano será marcado como concluído)"
          />
          {save.isError && (
            <Alert severity="error">{extractErrorMessage(save.error as unknown)}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={evolucao.trim().length < 5 || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Registrando…' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Util ----------

function Field({
  label,
  value,
  block,
}: {
  label: string;
  value: React.ReactNode;
  block?: boolean;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      {typeof value === 'string' ? (
        <Typography variant="body2" sx={block ? { whiteSpace: 'pre-wrap' } : undefined}>
          {value}
        </Typography>
      ) : (
        value
      )}
    </Box>
  );
}

function extractErrorMessage(err: unknown): string {
  type ErrShape = { response?: { data?: { message?: string | string[] } } };
  const m = (err as ErrShape | null)?.response?.data?.message;
  if (Array.isArray(m)) return m.join('; ');
  return m ?? 'Falha na operação.';
}
