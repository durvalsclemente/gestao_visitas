import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  TextField,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import { Controller } from 'react-hook-form';
import {
  FormCheckbox,
  FormDatePicker,
  FormFileUpload,
  FormSelect,
  FormTextField,
  PageHeader,
  SectionCard,
  StatusChip,
} from '../../shared/ui';
import { assistidosApi } from '../assistidos/api';
import {
  motivosVisitaApi,
  prioridadesApi,
  programasApi,
} from '../configuracoes/api';
import { solicitacoesApi, type SolicitacaoPayload } from './api';
import type { Frequencia, SolicitacaoFormValues } from './types';
import { STATUS_MAPPING } from './status-helpers';

const EMPTY: SolicitacaoFormValues = {
  assistidoId: '',
  programaId: '',
  motivoPrincipalId: '',
  motivosSecundariosIds: [],
  prioridadeId: '',
  descricaoDetalhada: '',
  dataFatoGerador: '',
  frequencia: '',
  acoesJaRealizadas: '',
  riscoImediato: false,
  necessidadeAvaliacaoTecnica: false,
  sugestaoPerfilVisitador: '',
  observacoes: '',
};

const FREQUENCIAS: { value: Frequencia; label: string }[] = [
  { value: 'UNICA', label: 'Única ocorrência' },
  { value: 'ESPORADICA', label: 'Esporádica' },
  { value: 'FREQUENTE', label: 'Frequente' },
  { value: 'CONTINUA', label: 'Contínua' },
];

export function SolicitacaoFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'novo';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { control, handleSubmit, reset, getValues } = useForm<SolicitacaoFormValues>({
    defaultValues: EMPTY,
  });

  // Carregar a solicitação no modo edição.
  const detail = useQuery({
    queryKey: ['solicitacoes-visita', id],
    queryFn: () => solicitacoesApi.get(id!),
    enabled: isEdit,
  });

  // Listas para os selects (ativos apenas).
  const assistidos = useQuery({
    queryKey: ['assistidos', 'select'],
    queryFn: () => assistidosApi.list({ limit: 100 }),
  });
  const programas = useQuery({
    queryKey: ['programas', 'select'],
    queryFn: () => programasApi.list({ limit: 100, ativo: true }),
  });
  const motivos = useQuery({
    queryKey: ['motivos-visita', 'select'],
    queryFn: () => motivosVisitaApi.list({ limit: 100, ativo: true }),
  });
  const prioridades = useQuery({
    queryKey: ['prioridades', 'select'],
    queryFn: () => prioridadesApi.list({ limit: 100, ativo: true }),
  });

  const motivoSecundarioOptions = useMemo(
    () => motivos.data?.items ?? [],
    [motivos.data],
  );

  // Pré-preencher quando a solicitação chegar.
  useEffect(() => {
    if (detail.data) {
      const d = detail.data;
      reset({
        assistidoId: d.assistido.id,
        programaId: d.programa?.id ?? '',
        motivoPrincipalId: d.motivoPrincipal?.id ?? '',
        motivosSecundariosIds: d.motivosSecundarios.map((m) => m.id),
        prioridadeId: d.prioridade?.id ?? '',
        descricaoDetalhada: d.descricaoDetalhada,
        dataFatoGerador: d.dataFatoGerador?.slice(0, 10) ?? '',
        frequencia: d.frequencia,
        acoesJaRealizadas: d.acoesJaRealizadas ?? '',
        riscoImediato: d.riscoImediato,
        necessidadeAvaliacaoTecnica: d.necessidadeAvaliacaoTecnica,
        sugestaoPerfilVisitador: d.sugestaoPerfilVisitador ?? '',
        observacoes: d.observacoes ?? '',
      });
    }
  }, [detail.data, reset]);

  const isLocked = isEdit && detail.data && detail.data.status !== 'RASCUNHO';

  const toPayload = (v: SolicitacaoFormValues): SolicitacaoPayload => ({
    assistidoId: v.assistidoId || undefined,
    programaId: v.programaId || undefined,
    motivoPrincipalId: v.motivoPrincipalId || undefined,
    motivosSecundariosIds: v.motivosSecundariosIds.length ? v.motivosSecundariosIds : undefined,
    prioridadeId: v.prioridadeId || undefined,
    descricaoDetalhada: v.descricaoDetalhada || undefined,
    dataFatoGerador: v.dataFatoGerador || undefined,
    frequencia: v.frequencia || undefined,
    acoesJaRealizadas: v.acoesJaRealizadas || undefined,
    riscoImediato: v.riscoImediato,
    necessidadeAvaliacaoTecnica: v.necessidadeAvaliacaoTecnica,
    sugestaoPerfilVisitador: v.sugestaoPerfilVisitador || undefined,
    observacoes: v.observacoes || undefined,
  });

  const saveDraft = useMutation({
    mutationFn: async (v: SolicitacaoFormValues) => {
      const payload = toPayload(v);
      if (isEdit) return solicitacoesApi.update(id!, payload);
      return solicitacoesApi.saveRascunho(payload);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['solicitacoes-visita'] });
      if (!isEdit) navigate(`/solicitacoes-visita/${saved.id}`, { replace: true });
    },
  });

  const submit = useMutation({
    mutationFn: async (v: SolicitacaoFormValues) => {
      const payload = toPayload(v);
      if (isEdit) {
        await solicitacoesApi.update(id!, payload);
        return solicitacoesApi.enviarParaTriagem(id!);
      }
      return solicitacoesApi.createAndSubmit(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitacoes-visita'] });
      navigate('/solicitacoes-visita');
    },
  });

  return (
    <>
      <PageHeader
        title={isEdit ? 'Solicitação de visita' : 'Nova solicitação de visita'}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Solicitações', to: '/solicitacoes-visita' },
          { label: isEdit ? 'Editar' : 'Nova' },
        ]}
        actions={
          detail.data && (
            <StatusChip status={detail.data.status} mapping={STATUS_MAPPING} />
          )
        }
      />

      {isLocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta solicitação já saiu do rascunho e está em tramitação. Os campos estão somente para leitura.
        </Alert>
      )}

      {(saveDraft.isError || submit.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage((saveDraft.error ?? submit.error) as unknown)}
        </Alert>
      )}

      <Box component="form" sx={{ '& fieldset': { borderRadius: 2 } }}>
        <fieldset disabled={!!isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
          <SectionCard title="Identificação">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSelect
                  name="assistidoId"
                  control={control}
                  label="Assistido"
                  required
                  withEmptyOption
                  options={
                    assistidos.data?.items.map((a) => ({ value: a.id, label: a.nome })) ?? []
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormSelect
                  name="programaId"
                  control={control}
                  label="Atividade / Curso / Projeto"
                  withEmptyOption
                  options={
                    programas.data?.items.map((p) => ({
                      value: p.id,
                      label: `${p.nome} · ${p.tipo.toLowerCase()}`,
                    })) ?? []
                  }
                />
              </Grid>
            </Grid>
          </SectionCard>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Motivo do pedido">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormSelect
                    name="motivoPrincipalId"
                    control={control}
                    label="Motivo principal"
                    required
                    withEmptyOption
                    options={
                      motivos.data?.items.map((m) => ({ value: m.id, label: m.nome })) ?? []
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    control={control}
                    name="motivosSecundariosIds"
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={motivoSecundarioOptions}
                        getOptionLabel={(o) => o.nome}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={motivoSecundarioOptions.filter((m) =>
                          field.value.includes(m.id),
                        )}
                        onChange={(_, v) => field.onChange(v.map((o) => o.id))}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              variant="outlined"
                              label={option.nome}
                              {...getTagProps({ index })}
                              key={option.id}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Motivos secundários"
                            placeholder="Selecione um ou mais"
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Detalhamento">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormTextField
                    name="descricaoDetalhada"
                    control={control}
                    label="Descrição detalhada"
                    required
                    multiline
                    minRows={4}
                    helperText="Mínimo 20 caracteres para envio à triagem."
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormDatePicker
                    name="dataFatoGerador"
                    control={control}
                    label="Data do fato gerador"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormSelect
                    name="frequencia"
                    control={control}
                    label="Frequência"
                    required
                    options={FREQUENCIAS.map((f) => ({ value: f.value, label: f.label }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormSelect
                    name="prioridadeId"
                    control={control}
                    label="Prioridade"
                    withEmptyOption
                    options={
                      prioridades.data?.items.map((p) => ({
                        value: p.id,
                        label: `${p.nome} (nível ${p.nivel})`,
                      })) ?? []
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormTextField
                    name="acoesJaRealizadas"
                    control={control}
                    label="Ações já realizadas"
                    multiline
                    minRows={2}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <SectionCard title="Avaliação">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormCheckbox
                    name="riscoImediato"
                    control={control}
                    label="Há risco imediato à integridade do assistido"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormCheckbox
                    name="necessidadeAvaliacaoTecnica"
                    control={control}
                    label="Necessita de avaliação técnica especializada"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormTextField
                    name="sugestaoPerfilVisitador"
                    control={control}
                    label="Sugestão de perfil do visitador"
                    helperText="Ex.: assistente social com experiência em primeira infância"
                  />
                </Grid>
              </Grid>
            </SectionCard>
          </Box>

          <Box sx={{ mt: 2 }}>
            <SectionCard
              title="Observações e anexos"
              subtitle="O envio físico dos arquivos será habilitado em breve. Por ora, anexos selecionados ficam apenas locais."
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormTextField
                    name="observacoes"
                    control={control}
                    label="Observações"
                    multiline
                    minRows={3}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name={'anexos' as never}
                    control={control}
                    defaultValue={[] as never}
                    render={() => (
                      <FormFileUpload
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        name={'anexos' as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        control={control as any}
                        label="Anexos"
                        accept="image/*,application/pdf"
                        multiple
                        maxSize={5 * 1024 * 1024}
                        helperText="Os arquivos selecionados não são enviados ainda — feature de upload no próximo bloco."
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          </Box>
        </fieldset>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="flex-end"
          sx={{ mt: 3 }}
        >
          <Button onClick={() => navigate('/solicitacoes-visita')} disabled={saveDraft.isPending || submit.isPending}>
            Voltar
          </Button>
          <Button
            startIcon={<SaveIcon />}
            disabled={!!isLocked || saveDraft.isPending || submit.isPending}
            onClick={handleSubmit((v) => saveDraft.mutate(v))}
          >
            {saveDraft.isPending ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!!isLocked || submit.isPending || !canSubmit(getValues())}
            onClick={handleSubmit((v) => submit.mutate(v))}
          >
            {submit.isPending ? 'Enviando…' : 'Enviar para triagem'}
          </Button>
        </Stack>
      </Box>
    </>
  );
}

function canSubmit(v: SolicitacaoFormValues): boolean {
  return (
    !!v.assistidoId &&
    !!v.motivoPrincipalId &&
    !!v.dataFatoGerador &&
    !!v.frequencia &&
    v.descricaoDetalhada.trim().length >= 20
  );
}

function extractErrorMessage(err: unknown): string {
  type ErrShape = { response?: { data?: { message?: string | string[] } } };
  const m = (err as ErrShape | null)?.response?.data?.message;
  if (Array.isArray(m)) return m.join('; ');
  return m ?? 'Falha na operação.';
}
