import { useEffect, useMemo, useState } from 'react';
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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import dayjs from 'dayjs';
import { PageHeader, SectionCard, SignaturePad, StatusChip } from '../../shared/ui';
import { STATUS_MAPPING, visitasApi } from './api';
import { relatorioApi, type RelatorioPayload } from './relatorio.api';
import type {
  Criticidade,
  MembroFamilia,
  MotivoNaoRealizacao,
  RelatorioFormState,
  SituacaoVisita,
  StatusCaso,
} from './relatorio.types';

const MOTIVOS_NAO_REALIZACAO: { value: MotivoNaoRealizacao; label: string }[] = [
  { value: 'ASSISTIDO_AUSENTE', label: 'Assistido ausente' },
  { value: 'ENDERECO_NAO_LOCALIZADO', label: 'Endereço não localizado' },
  { value: 'RECUSA_DE_ATENDIMENTO', label: 'Recusa do atendimento' },
  { value: 'RECUSA_DA_FAMILIA', label: 'Recusa da família' },
  { value: 'CONDICOES_INSEGURAS', label: 'Condições inseguras' },
  { value: 'IMPREVISTO_VISITADOR', label: 'Imprevisto do visitador' },
  { value: 'OUTRO', label: 'Outro' },
];

const CRITICIDADES: { value: Criticidade; label: string }[] = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MUITO_ALTA', label: 'Muito alta' },
];

const STATUS_CASO: { value: StatusCaso; label: string }[] = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'EM_ACOMPANHAMENTO', label: 'Em acompanhamento' },
  { value: 'ENCAMINHADO', label: 'Encaminhado' },
  { value: 'ENCERRADO', label: 'Encerrado' },
];

const EMPTY: RelatorioFormState = {
  dataExecucao: dayjs().format('YYYY-MM-DD'),
  horaInicio: '',
  horaFim: '',
  presencaFamilia: false,
  situacao: '',
  motivoNaoRealizacao: '',
  observacoesNaoRealizacao: '',
  condicoesResidencia: '',
  composicaoFamiliar: [],
  higiene: '',
  alimentacao: '',
  condicoesEmocionais: '',
  relacoesFamiliares: '',
  redeApoio: '',
  vulnerabilidade: '',
  comportamentoAssistido: '',
  relatos: '',
  dificuldades: '',
  impactosOsc: '',
  analiseTecnica: '',
  fatoresAgravantes: '',
  fatoresProtetivos: '',
  recomendacoes: '',
  planoInicial: '',
  criticidadeFinal: '',
  statusCaso: '',
  assinanteNome: '',
  assinaturaImagem: '',
};

export function ExecucaoVisitaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<RelatorioFormState>(EMPTY);
  const [naoRealizadaOpen, setNaoRealizadaOpen] = useState(false);

  const visita = useQuery({
    queryKey: ['visitas', id],
    queryFn: () => visitasApi.get(id!),
    enabled: !!id,
  });

  const relatorio = useQuery({
    queryKey: ['visitas', id, 'relatorio'],
    queryFn: () => relatorioApi.get(id!),
    enabled: !!id,
  });

  // Hidrata o form quando o relatório existe.
  useEffect(() => {
    const r = relatorio.data;
    if (!r) return;
    setForm({
      dataExecucao: r.dataExecucao ? dayjs(r.dataExecucao).format('YYYY-MM-DD') : EMPTY.dataExecucao,
      horaInicio: r.horaInicio ?? '',
      horaFim: r.horaFim ?? '',
      presencaFamilia: r.presencaFamilia,
      situacao: r.situacao ?? '',
      motivoNaoRealizacao: r.motivoNaoRealizacao ?? '',
      observacoesNaoRealizacao: r.observacoesNaoRealizacao ?? '',
      condicoesResidencia: r.condicoesResidencia ?? '',
      composicaoFamiliar: (r.composicaoFamiliar as MembroFamilia[] | null) ?? [],
      higiene: r.higiene ?? '',
      alimentacao: r.alimentacao ?? '',
      condicoesEmocionais: r.condicoesEmocionais ?? '',
      relacoesFamiliares: r.relacoesFamiliares ?? '',
      redeApoio: r.redeApoio ?? '',
      vulnerabilidade: r.vulnerabilidade ?? '',
      comportamentoAssistido: r.comportamentoAssistido ?? '',
      relatos: r.relatos ?? '',
      dificuldades: r.dificuldades ?? '',
      impactosOsc: r.impactosOsc ?? '',
      analiseTecnica: r.analiseTecnica ?? '',
      fatoresAgravantes: r.fatoresAgravantes ?? '',
      fatoresProtetivos: r.fatoresProtetivos ?? '',
      recomendacoes: r.recomendacoes ?? '',
      planoInicial: r.planoInicial ?? '',
      criticidadeFinal: r.criticidadeFinal ?? '',
      statusCaso: r.statusCaso ?? '',
      assinanteNome: r.assinanteNome ?? '',
      assinaturaImagem: r.assinaturaImagem ?? '',
    });
  }, [relatorio.data]);

  // ---------- Mutations ----------

  const checkInMut = useMutation({
    mutationFn: (coords: { latitude?: number; longitude?: number }) =>
      relatorioApi.checkIn(id!, coords),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas', id] });
      qc.invalidateQueries({ queryKey: ['visitas', id, 'relatorio'] });
    },
  });

  const draftMut = useMutation({
    mutationFn: () => relatorioApi.saveDraft(id!, toPayload(form)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitas', id, 'relatorio'] }),
  });

  const finalizeMut = useMutation({
    mutationFn: () =>
      relatorioApi.finalizar(id!, { ...toPayload(form), situacao: 'REALIZADA' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] });
      navigate(`/visitas/${id}`);
    },
  });

  const naoRealizadaMut = useMutation({
    mutationFn: (motivo: MotivoNaoRealizacao) =>
      relatorioApi.naoRealizada(id!, {
        motivoNaoRealizacao: motivo,
        observacoesNaoRealizacao: form.observacoesNaoRealizacao || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] });
      navigate(`/visitas/${id}`);
    },
  });

  // ---------- Geolocation para check-in ----------

  const doCheckIn = () => {
    if (!navigator.geolocation) {
      checkInMut.mutate({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        checkInMut.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => checkInMut.mutate({}),
      { enableHighAccuracy: false, timeout: 5000 },
    );
  };

  // ---------- Estados derivados ----------

  const podeFinalizar = useMemo(() => {
    return (
      form.dataExecucao &&
      form.analiseTecnica.trim().length > 0 &&
      form.recomendacoes.trim().length > 0 &&
      form.criticidadeFinal &&
      form.statusCaso &&
      form.assinanteNome.trim().length > 0 &&
      !!form.assinaturaImagem
    );
  }, [form]);

  if (visita.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (visita.isError || !visita.data) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Visita não encontrada.
      </Alert>
    );
  }

  const v = visita.data;
  const checkedIn = !!v.checkInEm;
  const finalizada = v.status === 'REALIZADA' || v.status === 'NAO_REALIZADA';

  if (finalizada) {
    return (
      <>
        <PageHeader
          title="Execução da visita"
          subtitle={v.assistido.nome}
          actions={<StatusChip status={v.status} mapping={STATUS_MAPPING} />}
        />
        <Alert severity="info">Esta visita já foi finalizada.</Alert>
      </>
    );
  }

  const setField = <K extends keyof RelatorioFormState>(k: K, val: RelatorioFormState[K]) =>
    setForm((s) => ({ ...s, [k]: val }));

  return (
    <>
      <PageHeader
        title="Execução da visita"
        subtitle={`${v.assistido.nome} · ${dayjs(v.dataAgendada).format('DD/MM/YYYY HH:mm')}`}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Agenda', to: '/agenda' },
          { label: v.assistido.nome },
        ]}
        actions={<StatusChip status={v.status} mapping={STATUS_MAPPING} />}
      />

      {(checkInMut.isError ||
        draftMut.isError ||
        finalizeMut.isError ||
        naoRealizadaMut.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(
            (checkInMut.error ??
              draftMut.error ??
              finalizeMut.error ??
              naoRealizadaMut.error) as unknown,
          )}
        </Alert>
      )}

      {/* ----- Check-in barra superior ----- */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Check-in {checkedIn ? 'realizado' : 'pendente'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {checkedIn
                ? `Chegada registrada em ${dayjs(v.checkInEm).format('DD/MM HH:mm')}`
                : 'Marque sua chegada antes de preencher o relatório.'}
            </Typography>
          </Box>
          <Button
            variant={checkedIn ? 'outlined' : 'contained'}
            startIcon={<LocationOnIcon />}
            disabled={checkedIn || checkInMut.isPending}
            onClick={doCheckIn}
            size="large"
          >
            {checkInMut.isPending ? 'Marcando…' : checkedIn ? 'Check-in OK' : 'Fazer check-in'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!checkedIn}
            onClick={() => setNaoRealizadaOpen(true)}
          >
            Tentativa não realizada
          </Button>
        </Stack>
      </Paper>

      {/* ----- Wizard ----- */}
      <SectionCard
        title="Relatório técnico"
        actions={
          <Chip
            size="small"
            label={
              relatorio.data?.updatedAt
                ? `Salvo ${dayjs(relatorio.data.updatedAt).format('DD/MM HH:mm')}`
                : 'Sem rascunho'
            }
            variant="outlined"
          />
        }
      >
        <Stepper
          activeStep={activeStep}
          orientation={isMdUp ? 'horizontal' : 'vertical'}
          nonLinear
        >
          {/* ---------- Passo 1: Identificação ---------- */}
          <Step>
            <StepLabel onClick={() => setActiveStep(0)} sx={{ cursor: 'pointer' }}>
              Identificação
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Data"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={form.dataExecucao}
                    onChange={(e) => setField('dataExecucao', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Hora início"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={form.horaInicio}
                    onChange={(e) => setField('horaInicio', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Hora fim"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={form.horaFim}
                    onChange={(e) => setField('horaFim', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.presencaFamilia}
                        onChange={(e) => setField('presencaFamilia', e.target.checked)}
                      />
                    }
                    label="Família estava presente"
                  />
                </Grid>
              </Grid>
              <StepActions
                onNext={() => setActiveStep(1)}
                onSaveDraft={() => draftMut.mutate()}
                saving={draftMut.isPending}
              />
            </StepContent>
          </Step>

          {/* ---------- Passo 2: Composição familiar ---------- */}
          <Step>
            <StepLabel onClick={() => setActiveStep(1)} sx={{ cursor: 'pointer' }}>
              Composição familiar
            </StepLabel>
            <StepContent>
              <ComposicaoFamiliarEditor
                value={form.composicaoFamiliar}
                onChange={(v) => setField('composicaoFamiliar', v)}
              />
              <StepActions
                onBack={() => setActiveStep(0)}
                onNext={() => setActiveStep(2)}
                onSaveDraft={() => draftMut.mutate()}
                saving={draftMut.isPending}
              />
            </StepContent>
          </Step>

          {/* ---------- Passo 3: Condições ---------- */}
          <Step>
            <StepLabel onClick={() => setActiveStep(2)} sx={{ cursor: 'pointer' }}>
              Condições observadas
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                {[
                  ['condicoesResidencia', 'Condições da residência'],
                  ['higiene', 'Higiene'],
                  ['alimentacao', 'Alimentação'],
                  ['condicoesEmocionais', 'Condições emocionais'],
                  ['relacoesFamiliares', 'Relações familiares'],
                  ['redeApoio', 'Rede de apoio'],
                  ['vulnerabilidade', 'Vulnerabilidade'],
                  ['comportamentoAssistido', 'Comportamento do assistido'],
                ].map(([key, label]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <TextField
                      label={label}
                      multiline
                      minRows={2}
                      fullWidth
                      value={form[key as keyof RelatorioFormState] as string}
                      onChange={(e) => setField(key as keyof RelatorioFormState, e.target.value as never)}
                    />
                  </Grid>
                ))}
              </Grid>
              <StepActions
                onBack={() => setActiveStep(1)}
                onNext={() => setActiveStep(3)}
                onSaveDraft={() => draftMut.mutate()}
                saving={draftMut.isPending}
              />
            </StepContent>
          </Step>

          {/* ---------- Passo 4: Análise técnica ---------- */}
          <Step>
            <StepLabel onClick={() => setActiveStep(3)} sx={{ cursor: 'pointer' }}>
              Análise técnica
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Relatos"
                    multiline
                    minRows={3}
                    fullWidth
                    value={form.relatos}
                    onChange={(e) => setField('relatos', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Dificuldades"
                    multiline
                    minRows={2}
                    fullWidth
                    value={form.dificuldades}
                    onChange={(e) => setField('dificuldades', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Impactos na OSC"
                    multiline
                    minRows={2}
                    fullWidth
                    value={form.impactosOsc}
                    onChange={(e) => setField('impactosOsc', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Análise técnica *"
                    multiline
                    minRows={4}
                    fullWidth
                    required
                    value={form.analiseTecnica}
                    onChange={(e) => setField('analiseTecnica', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Fatores agravantes"
                    multiline
                    minRows={2}
                    fullWidth
                    value={form.fatoresAgravantes}
                    onChange={(e) => setField('fatoresAgravantes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Fatores protetivos"
                    multiline
                    minRows={2}
                    fullWidth
                    value={form.fatoresProtetivos}
                    onChange={(e) => setField('fatoresProtetivos', e.target.value)}
                  />
                </Grid>
              </Grid>
              <StepActions
                onBack={() => setActiveStep(2)}
                onNext={() => setActiveStep(4)}
                onSaveDraft={() => draftMut.mutate()}
                saving={draftMut.isPending}
              />
            </StepContent>
          </Step>

          {/* ---------- Passo 5: Conclusão ---------- */}
          <Step>
            <StepLabel onClick={() => setActiveStep(4)} sx={{ cursor: 'pointer' }}>
              Conclusão
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Recomendações *"
                    multiline
                    minRows={3}
                    fullWidth
                    required
                    value={form.recomendacoes}
                    onChange={(e) => setField('recomendacoes', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Plano inicial"
                    multiline
                    minRows={3}
                    fullWidth
                    value={form.planoInicial}
                    onChange={(e) => setField('planoInicial', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Criticidade final</InputLabel>
                    <Select
                      label="Criticidade final"
                      value={form.criticidadeFinal}
                      onChange={(e) => setField('criticidadeFinal', e.target.value as Criticidade)}
                    >
                      {CRITICIDADES.map((c) => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Status do caso</InputLabel>
                    <Select
                      label="Status do caso"
                      value={form.statusCaso}
                      onChange={(e) => setField('statusCaso', e.target.value as StatusCaso)}
                    >
                      {STATUS_CASO.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <StepActions
                onBack={() => setActiveStep(3)}
                onNext={() => setActiveStep(5)}
                onSaveDraft={() => draftMut.mutate()}
                saving={draftMut.isPending}
              />
            </StepContent>
          </Step>

          {/* ---------- Passo 6: Assinatura e finalização ---------- */}
          <Step>
            <StepLabel onClick={() => setActiveStep(5)} sx={{ cursor: 'pointer' }}>
              Assinatura
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nome de quem assina *"
                    fullWidth
                    required
                    value={form.assinanteNome}
                    onChange={(e) => setField('assinanteNome', e.target.value)}
                    helperText="Pode ser o assistido, responsável ou testemunha presente."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Assinatura digital *
                  </Typography>
                  <SignaturePad
                    value={form.assinaturaImagem}
                    onChange={(d) => setField('assinaturaImagem', d)}
                    helperText="Assine no quadro acima usando dedo, mouse ou stylus."
                  />
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3 }} justifyContent="flex-end">
                <Button onClick={() => setActiveStep(4)} disabled={finalizeMut.isPending}>
                  Voltar
                </Button>
                <Button
                  startIcon={<SaveIcon />}
                  onClick={() => draftMut.mutate()}
                  disabled={draftMut.isPending}
                >
                  Salvar rascunho
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  disabled={!podeFinalizar || finalizeMut.isPending || !checkedIn}
                  onClick={() => finalizeMut.mutate()}
                >
                  {finalizeMut.isPending ? 'Finalizando…' : 'Finalizar visita'}
                </Button>
              </Stack>

              {!podeFinalizar && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Para finalizar é necessário: data, análise técnica, recomendações,
                  criticidade, status do caso, nome do assinante e assinatura digital.
                </Alert>
              )}
              {!checkedIn && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Faça check-in antes de finalizar.
                </Alert>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </SectionCard>

      {/* ----- Dialog: tentativa não realizada ----- */}
      <NaoRealizadaDialog
        open={naoRealizadaOpen}
        onClose={() => setNaoRealizadaOpen(false)}
        observacoes={form.observacoesNaoRealizacao}
        onObservacoesChange={(v) => setField('observacoesNaoRealizacao', v)}
        onConfirm={(motivo) => naoRealizadaMut.mutate(motivo)}
        loading={naoRealizadaMut.isPending}
      />
    </>
  );
}

// ---------- Subcomponentes ----------

interface StepActionsProps {
  onBack?: () => void;
  onNext?: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

function StepActions({ onBack, onNext, onSaveDraft, saving }: StepActionsProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
      {onBack && <Button onClick={onBack}>Voltar</Button>}
      {onSaveDraft && (
        <Button startIcon={<SaveIcon />} onClick={onSaveDraft} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar rascunho'}
        </Button>
      )}
      {onNext && (
        <Button variant="contained" onClick={onNext}>
          Continuar
        </Button>
      )}
    </Stack>
  );
}

interface ComposicaoEditorProps {
  value: MembroFamilia[];
  onChange: (v: MembroFamilia[]) => void;
}

function ComposicaoFamiliarEditor({ value, onChange }: ComposicaoEditorProps) {
  const add = () => onChange([...value, { nome: '', idade: undefined, vinculo: '' }]);
  const update = (i: number, patch: Partial<MembroFamilia>) =>
    onChange(value.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <Stack spacing={1}>
      {value.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nenhum membro adicionado.
        </Typography>
      )}
      {value.map((m, i) => (
        <Grid container spacing={1} key={i} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              size="small"
              label="Nome"
              value={m.nome}
              onChange={(e) => update(i, { nome: e.target.value })}
            />
          </Grid>
          <Grid item xs={4} sm={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Idade"
              value={m.idade ?? ''}
              onChange={(e) =>
                update(i, { idade: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Vínculo"
              value={m.vinculo ?? ''}
              onChange={(e) => update(i, { vinculo: e.target.value })}
            />
          </Grid>
          <Grid item xs={2} sm={1}>
            <IconButton aria-label="Remover membro" onClick={() => remove(i)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Box>
        <Button startIcon={<AddIcon />} onClick={add}>
          Adicionar membro
        </Button>
      </Box>
    </Stack>
  );
}

interface NaoRealizadaDialogProps {
  open: boolean;
  onClose: () => void;
  observacoes: string;
  onObservacoesChange: (v: string) => void;
  onConfirm: (motivo: MotivoNaoRealizacao) => void;
  loading: boolean;
}

function NaoRealizadaDialog({
  open,
  onClose,
  observacoes,
  onObservacoesChange,
  onConfirm,
  loading,
}: NaoRealizadaDialogProps) {
  const [motivo, setMotivo] = useState<MotivoNaoRealizacao | ''>('');

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Tentativa não realizada</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="warning">
            Esta ação encerra a visita como NÃO REALIZADA. O caso poderá ser reagendado
            posteriormente abrindo nova visita.
          </Alert>
          <FormControl fullWidth required>
            <InputLabel>Motivo</InputLabel>
            <Select
              label="Motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoNaoRealizacao)}
            >
              {MOTIVOS_NAO_REALIZACAO.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Observações"
            multiline
            minRows={3}
            value={observacoes}
            onChange={(e) => onObservacoesChange(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Voltar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!motivo || loading}
          onClick={() => motivo && onConfirm(motivo)}
        >
          {loading ? 'Registrando…' : 'Confirmar não realização'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Util ----------

function toPayload(form: RelatorioFormState): RelatorioPayload {
  const out: RelatorioPayload = {
    dataExecucao: form.dataExecucao || undefined,
    horaInicio: form.horaInicio || undefined,
    horaFim: form.horaFim || undefined,
    presencaFamilia: form.presencaFamilia,
    composicaoFamiliar: form.composicaoFamiliar.length ? form.composicaoFamiliar : undefined,
    condicoesResidencia: form.condicoesResidencia || undefined,
    higiene: form.higiene || undefined,
    alimentacao: form.alimentacao || undefined,
    condicoesEmocionais: form.condicoesEmocionais || undefined,
    relacoesFamiliares: form.relacoesFamiliares || undefined,
    redeApoio: form.redeApoio || undefined,
    vulnerabilidade: form.vulnerabilidade || undefined,
    comportamentoAssistido: form.comportamentoAssistido || undefined,
    relatos: form.relatos || undefined,
    dificuldades: form.dificuldades || undefined,
    impactosOsc: form.impactosOsc || undefined,
    analiseTecnica: form.analiseTecnica || undefined,
    fatoresAgravantes: form.fatoresAgravantes || undefined,
    fatoresProtetivos: form.fatoresProtetivos || undefined,
    recomendacoes: form.recomendacoes || undefined,
    planoInicial: form.planoInicial || undefined,
    criticidadeFinal: (form.criticidadeFinal || undefined) as RelatorioPayload['criticidadeFinal'],
    statusCaso: (form.statusCaso || undefined) as RelatorioPayload['statusCaso'],
    assinanteNome: form.assinanteNome || undefined,
    assinaturaImagem: form.assinaturaImagem || undefined,
  };
  return out;
}

function extractErrorMessage(err: unknown): string {
  type ErrShape = { response?: { data?: { message?: string | string[] } } };
  const m = (err as ErrShape | null)?.response?.data?.message;
  if (Array.isArray(m)) return m.join('; ');
  return m ?? 'Falha na operação.';
}
