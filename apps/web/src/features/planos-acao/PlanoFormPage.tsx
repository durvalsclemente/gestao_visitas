import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import {
  FormDatePicker,
  FormSelect,
  FormTextField,
  PageHeader,
  SectionCard,
} from '../../shared/ui';
import { assistidosApi } from '../assistidos/api';
import { planosApi } from './api';
import type { PlanoAcaoStatus, PlanoFormValues } from './types';

const EMPTY: PlanoFormValues = {
  assistidoId: '',
  visitaId: '',
  solicitacaoId: '',
  objetivo: '',
  problemaPrincipal: '',
  areaResponsavel: '',
  prazo: '',
  indicadorSucesso: '',
  status: 'RASCUNHO',
  dataRevisao: '',
  responsaveisExternalUserIds: [],
};

const STATUSES: { value: PlanoAcaoStatus; label: string }[] = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'EM_REVISAO', label: 'Em revisão' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function PlanoFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'novo';
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const { control, handleSubmit, reset, watch } = useForm<PlanoFormValues>({
    defaultValues: EMPTY,
  });

  const detail = useQuery({
    queryKey: ['planos-acao', id],
    queryFn: () => planosApi.get(id!),
    enabled: isEdit,
  });

  const assistidos = useQuery({
    queryKey: ['assistidos', 'select'],
    queryFn: () => assistidosApi.list({ limit: 100 }),
  });

  // Pré-preenchimento via querystring quando criamos a partir de uma visita.
  useEffect(() => {
    if (isEdit) return;
    const assistidoId = search.get('assistidoId') ?? '';
    const visitaId = search.get('visitaId') ?? '';
    const solicitacaoId = search.get('solicitacaoId') ?? '';
    if (assistidoId || visitaId || solicitacaoId) {
      reset({ ...EMPTY, assistidoId, visitaId, solicitacaoId });
    }
  }, [isEdit, search, reset]);

  useEffect(() => {
    if (detail.data) {
      reset({
        assistidoId: detail.data.assistido.id,
        visitaId: detail.data.visitaId ?? '',
        solicitacaoId: detail.data.solicitacaoId ?? '',
        objetivo: detail.data.objetivo,
        problemaPrincipal: detail.data.problemaPrincipal,
        areaResponsavel: detail.data.areaResponsavel ?? '',
        prazo: detail.data.prazo?.slice(0, 10) ?? '',
        indicadorSucesso: detail.data.indicadorSucesso ?? '',
        status: detail.data.status,
        dataRevisao: detail.data.dataRevisao?.slice(0, 10) ?? '',
        responsaveisExternalUserIds: detail.data.responsaveisExternalUserIds,
      });
    }
  }, [detail.data, reset]);

  const save = useMutation({
    mutationFn: (v: PlanoFormValues) => {
      const payload = {
        assistidoId: v.assistidoId,
        visitaId: v.visitaId || undefined,
        solicitacaoId: v.solicitacaoId || undefined,
        objetivo: v.objetivo,
        problemaPrincipal: v.problemaPrincipal,
        areaResponsavel: v.areaResponsavel || undefined,
        prazo: v.prazo || undefined,
        indicadorSucesso: v.indicadorSucesso || undefined,
        status: v.status,
        dataRevisao: v.dataRevisao || undefined,
        responsaveisExternalUserIds: v.responsaveisExternalUserIds,
      };
      return isEdit ? planosApi.update(id!, payload) : planosApi.create(payload);
    },
    onSuccess: (saved) => {
      navigate(`/planos-acao/${saved.id}`, { replace: true });
    },
  });

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar plano de ação' : 'Novo plano de ação'}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Planos de ação', to: '/planos-acao' },
          { label: isEdit ? 'Editar' : 'Novo' },
        ]}
      />

      {save.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(save.error as unknown)}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <SectionCard title="Caso">
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
                name="status"
                control={control}
                label="Status"
                required
                options={STATUSES}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ mt: 2 }}>
          <SectionCard title="Objetivo e problema">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormTextField
                  name="objetivo"
                  control={control}
                  label="Objetivo"
                  required
                  multiline
                  minRows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <FormTextField
                  name="problemaPrincipal"
                  control={control}
                  label="Problema principal"
                  required
                  multiline
                  minRows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <FormTextField
                  name="indicadorSucesso"
                  control={control}
                  label="Indicador de sucesso"
                  helperText="Como saberemos que o objetivo foi alcançado?"
                />
              </Grid>
            </Grid>
          </SectionCard>
        </Box>

        <Box sx={{ mt: 2 }}>
          <SectionCard title="Responsabilidade e prazo">
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormTextField
                  name="areaResponsavel"
                  control={control}
                  label="Área responsável"
                  placeholder="Ex.: Social, Pedagógico"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormDatePicker name="prazo" control={control} label="Prazo" />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormDatePicker name="dataRevisao" control={control} label="Data de revisão" />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  control={control}
                  name="responsaveisExternalUserIds"
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={field.value}
                      onChange={(_, v) => field.onChange(v)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Responsáveis (externalUserId)"
                          placeholder="Cole o UUID e pressione Enter"
                          helperText="UUIDs dos usuários da Central. Sem FK local."
                        />
                      )}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </SectionCard>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button onClick={() => navigate('/planos-acao')} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </Stack>
      </Box>
    </>
  );
}

function extractErrorMessage(err: unknown): string {
  type ErrShape = { response?: { data?: { message?: string | string[] } } };
  const m = (err as ErrShape | null)?.response?.data?.message;
  if (Array.isArray(m)) return m.join('; ');
  return m ?? 'Falha ao salvar.';
}
