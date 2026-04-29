import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import {
  ConfirmDialog,
  PageHeader,
  SectionCard,
  StatusChip,
} from '../../shared/ui';
import { STATUS_MAPPING, visitasApi } from './api';
import { relatorioPdfApi } from './relatorio.api';
import { DocumentosPanel } from '../documentos/DocumentosPanel';
import type { Visita } from './types';

export function VisitaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['visitas', id],
    queryFn: () => visitasApi.get(id!),
    enabled: !!id,
  });

  const [reagOpen, setReagOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [novaData, setNovaData] = useState('');
  const [motivoReagendamento, setMotivoReagendamento] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const reagendarMut = useMutation({
    mutationFn: () =>
      visitasApi.reagendar(id!, {
        novaDataAgendada: novaData,
        motivoReagendamento: motivoReagendamento || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] });
      setReagOpen(false);
      setNovaData('');
      setMotivoReagendamento('');
    },
  });

  const cancelarMut = useMutation({
    mutationFn: () => visitasApi.cancelar(id!, { motivoCancelamento }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] });
      setCancelOpen(false);
      setMotivoCancelamento('');
    },
  });

  const confirmarMut = useMutation({
    mutationFn: () => visitasApi.confirmar(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] });
      setConfirmOpen(false);
    },
  });

  if (detail.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (detail.isError || !detail.data) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Visita não encontrada.
      </Alert>
    );
  }

  const v: Visita = detail.data;
  const podeAgir = v.status !== 'CANCELADA' && v.status !== 'REALIZADA';

  return (
    <>
      <PageHeader
        title={`Visita · ${v.assistido.nome}`}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Agenda', to: '/agenda' },
          { label: v.assistido.nome },
        ]}
        actions={<StatusChip status={v.status} mapping={STATUS_MAPPING} />}
      />

      {(reagendarMut.isError || cancelarMut.isError || confirmarMut.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(
            (reagendarMut.error ?? cancelarMut.error ?? confirmarMut.error) as unknown,
          )}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <SectionCard title="Dados da visita">
            <Stack spacing={1.5}>
              <Field
                label="Data agendada"
                value={dayjs(v.dataAgendada).format('DD/MM/YYYY HH:mm')}
              />
              <Field label="Tipo" value={v.tipo} />
              <Field
                label="Duração estimada"
                value={v.duracaoMinutos ? `${v.duracaoMinutos} min` : '—'}
              />
              <Field label="Endereço" value={v.endereco ?? '—'} block />
              <Field label="Observações" value={v.observacoes ?? '—'} block />
              <Divider />
              <Field
                label="Visitador primário"
                value={
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={v.visitador.nome} />
                    {v.visitador.perfis.map((p) => (
                      <Chip key={p} size="small" label={p} variant="outlined" />
                    ))}
                  </Stack>
                }
              />
              {v.visitadorSecundario && (
                <Field
                  label="Visitador secundário"
                  value={
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={v.visitadorSecundario.nome} />
                      {v.visitadorSecundario.perfis.map((p) => (
                        <Chip key={p} size="small" label={p} variant="outlined" />
                      ))}
                    </Stack>
                  }
                />
              )}
              {v.confirmadaEm && (
                <Field
                  label="Confirmada em"
                  value={dayjs(v.confirmadaEm).format('DD/MM/YYYY HH:mm')}
                />
              )}
              {v.motivoCancelamento && (
                <Field label="Motivo do cancelamento" value={v.motivoCancelamento} block />
              )}
              {v.motivoReagendamento && v.reagendamentoCount > 0 && (
                <Field
                  label={`Último reagendamento (${v.reagendamentoCount}x)`}
                  value={v.motivoReagendamento}
                  block
                />
              )}
              {v.dataRealizada && (
                <Field
                  label="Realizada em"
                  value={dayjs(v.dataRealizada).format('DD/MM/YYYY HH:mm')}
                />
              )}
              {v.resultado && <Field label="Resultado" value={v.resultado} block />}
            </Stack>
          </SectionCard>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Documentos da visita">
              <DocumentosPanel parent="visita" parentId={v.id} />
            </SectionCard>
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          {!podeAgir && (
            <Box sx={{ mb: 2 }}>
              <SectionCard title="Relatório institucional">
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<DescriptionIcon />}
                    onClick={() => navigate(`/visitas/${v.id}/relatorio`)}
                  >
                    Visualizar relatório
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => relatorioPdfApi.download(v.id, 'completo')}
                  >
                    Baixar PDF (completo)
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => relatorioPdfApi.download(v.id, 'resumido')}
                  >
                    Baixar PDF (resumido)
                  </Button>
                </Stack>
              </SectionCard>
            </Box>
          )}

          <SectionCard title="Ações">
            {!podeAgir ? (
              <Alert severity="info">
                Visita {v.status.toLowerCase()} — sem ações disponíveis.
              </Alert>
            ) : (
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => navigate(`/visitas/${v.id}/executar`)}
                >
                  Executar visita
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  disabled={!!v.confirmadaEm}
                  onClick={() => setConfirmOpen(true)}
                >
                  {v.confirmadaEm ? 'Já confirmada' : 'Confirmar agendamento'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EventIcon />}
                  onClick={() => {
                    setNovaData(dayjs(v.dataAgendada).format('YYYY-MM-DDTHH:mm'));
                    setReagOpen(true);
                  }}
                >
                  Reagendar
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<EventBusyIcon />}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancelar visita
                </Button>
                <Divider sx={{ my: 1 }} />
                <Button
                  variant="text"
                  startIcon={<EventAvailableIcon />}
                  onClick={() =>
                    visitasApi.realizar(v.id, {}).then(() => {
                      qc.invalidateQueries({ queryKey: ['visitas'] });
                      navigate('/agenda');
                    })
                  }
                >
                  Marcar como realizada
                </Button>
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ----- Reagendar ----- */}
      <Dialog open={reagOpen} onClose={() => !reagendarMut.isPending && setReagOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reagendar visita</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nova data e hora"
              type="datetime-local"
              required
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Motivo (opcional)"
              multiline
              minRows={2}
              value={motivoReagendamento}
              onChange={(e) => setMotivoReagendamento(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setReagOpen(false)} disabled={reagendarMut.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!novaData || reagendarMut.isPending}
            onClick={() => reagendarMut.mutate()}
          >
            {reagendarMut.isPending ? 'Reagendando…' : 'Reagendar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ----- Cancelar ----- */}
      <Dialog open={cancelOpen} onClose={() => !cancelarMut.isPending && setCancelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cancelar visita</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              O cancelamento é definitivo: a visita não poderá mais ser confirmada ou realizada.
            </Alert>
            <TextField
              label="Motivo do cancelamento"
              required
              multiline
              minRows={2}
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelarMut.isPending}>
            Voltar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={motivoCancelamento.trim().length < 3 || cancelarMut.isPending}
            onClick={() => cancelarMut.mutate()}
          >
            {cancelarMut.isPending ? 'Cancelando…' : 'Cancelar visita'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ----- Confirmar ----- */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar agendamento?"
        message="Você confirma que esta visita foi agendada com sucesso e está no calendário do(s) visitador(es)?"
        confirmLabel="Confirmar"
        loading={confirmarMut.isPending}
        onConfirm={async () => {
          await confirmarMut.mutateAsync();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

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
