import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  FormSelect,
  FormTextField,
  PageHeader,
  SectionCard,
} from '../../shared/ui';
import { Controller } from 'react-hook-form';
import { solicitacoesApi } from '../solicitacoes-visita/api';
import { visitadoresApi } from '../visitadores/api';
import { visitasApi } from './api';
import type { DesignarPayload, VisitaTipo } from './types';

interface FormValues {
  visitadorId: string;
  visitadorSecundarioId: string;
  tipo: VisitaTipo | '';
  dataAgendada: string; // ISO datetime-local
  duracaoMinutos: string;
  endereco: string;
  observacoes: string;
}

const EMPTY: FormValues = {
  visitadorId: '',
  visitadorSecundarioId: '',
  tipo: 'INICIAL',
  dataAgendada: '',
  duracaoMinutos: '60',
  endereco: '',
  observacoes: '',
};

const TIPOS = [
  { value: 'INICIAL', label: 'Inicial' },
  { value: 'ACOMPANHAMENTO', label: 'Acompanhamento' },
  { value: 'ENCERRAMENTO', label: 'Encerramento' },
  { value: 'EMERGENCIAL', label: 'Emergencial' },
];

export function DesignarVisitaPage() {
  const { solicitacaoId } = useParams<{ solicitacaoId: string }>();
  const navigate = useNavigate();

  const sol = useQuery({
    queryKey: ['solicitacoes-visita', solicitacaoId],
    queryFn: () => solicitacoesApi.get(solicitacaoId!),
    enabled: !!solicitacaoId,
  });

  // Filtra visitadores ativos. Front mostra perfil/região para ajudar o casamento.
  const visitadores = useQuery({
    queryKey: ['visitadores', 'designar'],
    queryFn: () => visitadoresApi.list({ limit: 100, ativo: true }),
  });

  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: EMPTY,
  });

  const visitadorId = watch('visitadorId');
  const visitadorSecundarioId = watch('visitadorSecundarioId');

  // Pré-preenche endereço com o do assistido + sugestão de perfil.
  useEffect(() => {
    if (sol.data) {
      setValue('endereco', '', { shouldDirty: false });
    }
  }, [sol.data, setValue]);

  const designar = useMutation({
    mutationFn: (payload: DesignarPayload) => visitasApi.designar(payload),
    onSuccess: (visita) => {
      navigate(`/visitas/${visita.id}`);
    },
  });

  const onSubmit = handleSubmit((v) => {
    if (!solicitacaoId) return;
    if (v.visitadorSecundarioId && v.visitadorSecundarioId === v.visitadorId) {
      designar.reset();
      return;
    }
    designar.mutate({
      solicitacaoId,
      visitadorId: v.visitadorId,
      visitadorSecundarioId: v.visitadorSecundarioId || undefined,
      tipo: v.tipo as VisitaTipo,
      dataAgendada: new Date(v.dataAgendada).toISOString(),
      duracaoMinutos: v.duracaoMinutos ? Number(v.duracaoMinutos) : undefined,
      endereco: v.endereco || undefined,
      observacoes: v.observacoes || undefined,
    });
  });

  const opcoesVisitadores = (visitadores.data?.items ?? []).map((v) => ({
    value: v.id,
    label: `${v.nome}${v.perfis.length ? ` · ${v.perfis.join(', ')}` : ''}`,
  }));

  const visitadorSelecionado = visitadores.data?.items.find((v) => v.id === visitadorId);
  const necessidadeDupla = sol.data?.observacoes?.toLowerCase().includes('dupla');

  if (sol.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (sol.isError || !sol.data)
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Solicitação não encontrada.
      </Alert>
    );
  if (sol.data.status !== 'APROVADA')
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Apenas solicitações com status APROVADA podem ser designadas para visita.
        Status atual: <strong>{sol.data.status}</strong>.
      </Alert>
    );

  return (
    <>
      <PageHeader
        title="Designar visita"
        subtitle={`${sol.data.assistido.nome} · solicitação ${sol.data.id.slice(0, 8)}`}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Solicitações', to: '/solicitacoes-visita' },
          { label: 'Designar' },
        ]}
      />

      {designar.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(designar.error as unknown)}
        </Alert>
      )}

      {visitadorSecundarioId && visitadorId && visitadorSecundarioId === visitadorId && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Visitador secundário não pode ser o mesmo que o primário.
        </Alert>
      )}

      <Box component="form" onSubmit={onSubmit}>
        <SectionCard title="Resumo da solicitação">
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Motivo principal:</strong> {sol.data.motivoPrincipal?.nome ?? '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Prioridade:</strong>{' '}
              {sol.data.prioridade ? (
                <Chip
                  label={sol.data.prioridade.nome}
                  size="small"
                  sx={{
                    bgcolor: sol.data.prioridade.cor ?? undefined,
                    color: sol.data.prioridade.cor ? '#fff' : undefined,
                  }}
                />
              ) : (
                '—'
              )}
            </Typography>
            {sol.data.sugestaoPerfilVisitador && (
              <Typography variant="body2">
                <strong>Sugestão de perfil:</strong> {sol.data.sugestaoPerfilVisitador}
              </Typography>
            )}
            <Typography variant="body2">
              <strong>Risco imediato:</strong> {sol.data.riscoImediato ? 'Sim' : 'Não'}
            </Typography>
          </Stack>
        </SectionCard>

        <Box sx={{ mt: 2 }}>
          <SectionCard title="Designação">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSelect
                  name="visitadorId"
                  control={control}
                  label="Visitador primário"
                  required
                  withEmptyOption
                  options={opcoesVisitadores}
                />
                {visitadorSelecionado && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {visitadorSelecionado.regioes.map((r) => (
                      <Chip key={r} size="small" label={`Região: ${r}`} variant="outlined" />
                    ))}
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <FormSelect
                  name="visitadorSecundarioId"
                  control={control}
                  label={`Visitador secundário${necessidadeDupla ? ' (recomendado)' : ' (opcional)'}`}
                  withEmptyOption
                  options={opcoesVisitadores}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormSelect
                  name="tipo"
                  control={control}
                  label="Tipo da visita"
                  required
                  options={TIPOS}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="dataAgendada"
                  control={control}
                  rules={{ required: true }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="datetime-local"
                      label="Data e hora"
                      required
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error ? 'Obrigatório' : undefined}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormTextField
                  name="duracaoMinutos"
                  control={control}
                  label="Duração (min)"
                  type="number"
                  inputProps={{ min: 15, step: 15 }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormTextField
                  name="endereco"
                  control={control}
                  label="Endereço da visita"
                />
              </Grid>
              <Grid item xs={12}>
                <FormTextField
                  name="observacoes"
                  control={control}
                  label="Observações para o(s) visitador(es)"
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button
                onClick={() => navigate('/solicitacoes-visita')}
                disabled={designar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={designar.isPending}>
                {designar.isPending ? 'Designando…' : 'Designar e agendar'}
              </Button>
            </Stack>
          </SectionCard>
        </Box>
      </Box>
    </>
  );
}

function extractErrorMessage(err: unknown): string {
  type ErrShape = { response?: { data?: { message?: string | string[] } } };
  const m = (err as ErrShape | null)?.response?.data?.message;
  if (Array.isArray(m)) return m.join('; ');
  return m ?? 'Falha ao designar.';
}
