import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import {
  FormCheckbox,
  FormDatePicker,
  FormSelect,
  FormTextField,
  PageHeader,
  SectionCard,
  StatusChip,
} from '../../shared/ui';
import { solicitacoesApi } from '../solicitacoes-visita/api';
import { STATUS_MAPPING } from '../solicitacoes-visita/status-helpers';
import { prioridadesApi } from '../configuracoes/api';
import { tiposEncaminhamentoApi } from '../configuracoes/api';
import { triagemApi, type DecidirPayload } from './api';
import type { TriagemDecisao, TriagemDecisaoFormValues } from './types';

const COMPLEXIDADES = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MUITO_ALTA', label: 'Muito alta' },
];

const DECISOES: { value: TriagemDecisao; label: string }[] = [
  { value: 'APROVAR_VISITA', label: 'Aprovar visita' },
  { value: 'DEVOLVER_COMPLEMENTACAO', label: 'Devolver para complementação' },
  { value: 'REJEITAR', label: 'Rejeitar' },
  { value: 'RECLASSIFICAR_PRIORIDADE', label: 'Reclassificar prioridade' },
  { value: 'ENCAMINHAR_OUTRO_SETOR', label: 'Encaminhar para outro setor' },
];

const EMPTY: TriagemDecisaoFormValues = {
  complexidade: '',
  tipoAtendimentoIndicado: '',
  necessidadeDuplaVisita: false,
  necessidadePsicologo: false,
  necessidadeAssistenteSocial: false,
  dataLimiteRecomendada: '',
  justificativaTecnica: '',
  decisao: '',
  prioridadeReclassificadaId: '',
  setorEncaminhamentoId: '',
};

export function TriagemDecisionPage() {
  const { solicitacaoId } = useParams<{ solicitacaoId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sol = useQuery({
    queryKey: ['solicitacoes-visita', solicitacaoId],
    queryFn: () => solicitacoesApi.get(solicitacaoId!),
    enabled: !!solicitacaoId,
  });

  const historico = useQuery({
    queryKey: ['triagem', 'historico', solicitacaoId],
    queryFn: () => triagemApi.historico(solicitacaoId!),
    enabled: !!solicitacaoId,
  });

  const prioridades = useQuery({
    queryKey: ['prioridades', 'select'],
    queryFn: () => prioridadesApi.list({ limit: 100, ativo: true }),
  });

  const setores = useQuery({
    queryKey: ['tipos-encaminhamento', 'select'],
    queryFn: () => tiposEncaminhamentoApi.list({ limit: 100, ativo: true }),
  });

  const { control, handleSubmit, watch, setValue } = useForm<TriagemDecisaoFormValues>({
    defaultValues: EMPTY,
  });

  const decisao = watch('decisao');

  // Limpa os campos condicionais ao trocar a decisão.
  useEffect(() => {
    if (decisao !== 'RECLASSIFICAR_PRIORIDADE') {
      setValue('prioridadeReclassificadaId', '');
    }
    if (decisao !== 'ENCAMINHAR_OUTRO_SETOR') {
      setValue('setorEncaminhamentoId', '');
    }
  }, [decisao, setValue]);

  const status = sol.data?.status;
  const podeAssumir = status === 'ENVIADA_TRIAGEM';
  const podeDecidir = status === 'EM_TRIAGEM';
  const finalizada = useMemo(
    () => status && !['ENVIADA_TRIAGEM', 'EM_TRIAGEM', 'RASCUNHO'].includes(status),
    [status],
  );

  const assumir = useMutation({
    mutationFn: () => triagemApi.assumir(solicitacaoId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitacoes-visita', solicitacaoId] });
      qc.invalidateQueries({ queryKey: ['triagem'] });
    },
  });

  const decidir = useMutation({
    mutationFn: (payload: DecidirPayload) => triagemApi.decidir(solicitacaoId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitacoes-visita'] });
      qc.invalidateQueries({ queryKey: ['triagem'] });
      navigate('/triagem');
    },
  });

  if (sol.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (sol.isError || !sol.data)
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Solicitação não encontrada.
      </Alert>
    );

  const s = sol.data;
  const onSubmit = handleSubmit((v) => {
    const payload: DecidirPayload = {
      complexidade: v.complexidade as string,
      tipoAtendimentoIndicado: v.tipoAtendimentoIndicado || undefined,
      necessidadeDuplaVisita: v.necessidadeDuplaVisita,
      necessidadePsicologo: v.necessidadePsicologo,
      necessidadeAssistenteSocial: v.necessidadeAssistenteSocial,
      dataLimiteRecomendada: v.dataLimiteRecomendada || undefined,
      justificativaTecnica: v.justificativaTecnica,
      decisao: v.decisao as TriagemDecisao,
      prioridadeReclassificadaId: v.prioridadeReclassificadaId || undefined,
      setorEncaminhamentoId: v.setorEncaminhamentoId || undefined,
    };
    decidir.mutate(payload);
  });

  return (
    <>
      <PageHeader
        title="Triagem de solicitação"
        subtitle={s.assistido.nome}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Triagem', to: '/triagem' },
          { label: s.assistido.nome },
        ]}
        actions={<StatusChip status={s.status} mapping={STATUS_MAPPING} />}
      />

      <Grid container spacing={2}>
        {/* ----- Painel da solicitação (read-only) ----- */}
        <Grid item xs={12} md={5}>
          <SectionCard title="Detalhes da solicitação">
            <Stack spacing={1.5}>
              <Field label="Assistido" value={`${s.assistido.nome}${s.assistido.cpf ? ` · ${s.assistido.cpf}` : ''}`} />
              <Field label="Programa" value={s.programa?.nome ?? '—'} />
              <Field label="Motivo principal" value={s.motivoPrincipal?.nome ?? '—'} />
              <Field
                label="Motivos secundários"
                value={
                  s.motivosSecundarios.length > 0
                    ? s.motivosSecundarios.map((m) => m.nome).join(', ')
                    : '—'
                }
              />
              <Field label="Frequência" value={s.frequencia} />
              <Field
                label="Data do fato gerador"
                value={
                  s.dataFatoGerador
                    ? new Date(s.dataFatoGerador).toLocaleDateString('pt-BR')
                    : '—'
                }
              />
              <Field
                label="Prioridade"
                value={
                  s.prioridade ? (
                    <Chip
                      label={`${s.prioridade.nome} (nível ${s.prioridade.nivel})`}
                      size="small"
                      sx={{
                        bgcolor: s.prioridade.cor ?? undefined,
                        color: s.prioridade.cor ? '#fff' : undefined,
                      }}
                    />
                  ) : (
                    '—'
                  )
                }
              />
              <Field label="Risco imediato" value={s.riscoImediato ? 'Sim' : 'Não'} />
              <Field
                label="Avaliação técnica solicitada"
                value={s.necessidadeAvaliacaoTecnica ? 'Sim' : 'Não'}
              />
              <Divider />
              <Field label="Descrição" value={s.descricaoDetalhada} block />
              {s.acoesJaRealizadas && (
                <Field label="Ações já realizadas" value={s.acoesJaRealizadas} block />
              )}
              {s.sugestaoPerfilVisitador && (
                <Field
                  label="Sugestão de perfil do visitador"
                  value={s.sugestaoPerfilVisitador}
                  block
                />
              )}
              {s.observacoes && <Field label="Observações" value={s.observacoes} block />}
            </Stack>
          </SectionCard>

          {historico.data && historico.data.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <SectionCard title={`Histórico de triagens (${historico.data.length})`}>
                <List dense disablePadding>
                  {historico.data.map((t) => (
                    <ListItem key={t.id} divider>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={t.decisao} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(t.createdAt).toLocaleString('pt-BR')}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <>
                            <Typography variant="body2">{t.justificativaTecnica}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t.statusAnterior} → {t.statusNovo} · triador: {t.triadorExternalUserId}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </SectionCard>
            </Box>
          )}
        </Grid>

        {/* ----- Painel de decisão ----- */}
        <Grid item xs={12} md={7}>
          {finalizada && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Esta solicitação já está finalizada (status {s.status}). Triagem fechada.
            </Alert>
          )}

          {podeAssumir && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button
                  startIcon={<AssignmentTurnedInIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => assumir.mutate()}
                  disabled={assumir.isPending}
                >
                  Assumir triagem
                </Button>
              }
            >
              Esta solicitação ainda não tem triador. Assuma para registrar a decisão.
            </Alert>
          )}

          {(decidir.isError || assumir.isError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractErrorMessage((decidir.error ?? assumir.error) as unknown)}
            </Alert>
          )}

          <SectionCard title="Análise técnica">
            <Box component="form" onSubmit={onSubmit}>
              <fieldset
                disabled={!podeDecidir}
                style={{ border: 'none', padding: 0, margin: 0 }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormSelect
                      name="complexidade"
                      control={control}
                      label="Complexidade"
                      required
                      options={COMPLEXIDADES}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormTextField
                      name="tipoAtendimentoIndicado"
                      control={control}
                      label="Tipo de atendimento indicado"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormCheckbox
                      name="necessidadeDuplaVisita"
                      control={control}
                      label="Dupla visita"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormCheckbox
                      name="necessidadePsicologo"
                      control={control}
                      label="Psicólogo"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormCheckbox
                      name="necessidadeAssistenteSocial"
                      control={control}
                      label="Assistente social"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormDatePicker
                      name="dataLimiteRecomendada"
                      control={control}
                      label="Data limite recomendada"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormTextField
                      name="justificativaTecnica"
                      control={control}
                      label="Justificativa técnica"
                      required
                      multiline
                      minRows={3}
                      helperText="Mínimo 10 caracteres."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Divider textAlign="left">Decisão</Divider>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormSelect
                      name="decisao"
                      control={control}
                      label="Decisão"
                      required
                      options={DECISOES}
                    />
                  </Grid>

                  {decisao === 'RECLASSIFICAR_PRIORIDADE' && (
                    <Grid item xs={12} md={6}>
                      <FormSelect
                        name="prioridadeReclassificadaId"
                        control={control}
                        label="Nova prioridade"
                        required
                        options={
                          prioridades.data?.items.map((p) => ({
                            value: p.id,
                            label: `${p.nome} (nível ${p.nivel})`,
                          })) ?? []
                        }
                      />
                    </Grid>
                  )}

                  {decisao === 'ENCAMINHAR_OUTRO_SETOR' && (
                    <Grid item xs={12} md={6}>
                      <FormSelect
                        name="setorEncaminhamentoId"
                        control={control}
                        label="Setor de destino"
                        required
                        options={
                          setores.data?.items.map((t) => ({ value: t.id, label: t.nome })) ?? []
                        }
                      />
                    </Grid>
                  )}
                </Grid>

                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
                  <Button onClick={() => navigate('/triagem')} disabled={decidir.isPending}>
                    Voltar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<GavelIcon />}
                    type="submit"
                    disabled={!podeDecidir || decidir.isPending}
                  >
                    {decidir.isPending ? 'Registrando…' : 'Registrar decisão'}
                  </Button>
                </Stack>
              </fieldset>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>
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
