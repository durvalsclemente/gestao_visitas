import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Grid, Stack } from '@mui/material';
import {
  FormCheckbox,
  FormSelect,
  FormTextField,
  PageHeader,
  SectionCard,
} from '../../shared/ui';
import { educadoresApi } from './api';
import type { EducadorFormValues } from './types';

const EMPTY: EducadorFormValues = {
  nome: '',
  email: '',
  telefone: '',
  cargo: 'EDUCADOR',
  formacao: '',
  ativo: true,
  observacoes: '',
  externalUserId: '',
};

export function EducadorFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'novo';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { control, handleSubmit, reset } = useForm<EducadorFormValues>({ defaultValues: EMPTY });

  const detail = useQuery({
    queryKey: ['educadores', id],
    queryFn: () => educadoresApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (detail.data) {
      reset({
        nome: detail.data.nome,
        email: detail.data.email ?? '',
        telefone: detail.data.telefone ?? '',
        cargo: detail.data.cargo,
        formacao: detail.data.formacao ?? '',
        ativo: detail.data.ativo,
        observacoes: detail.data.observacoes ?? '',
        externalUserId: detail.data.externalUserId ?? '',
      });
    }
  }, [detail.data, reset]);

  const save = useMutation({
    mutationFn: (values: EducadorFormValues) => {
      const cleaned = removeEmpty(values);
      return isEdit ? educadoresApi.update(id!, cleaned) : educadoresApi.create(cleaned);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['educadores'] });
      navigate('/educadores');
    },
  });

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar educador' : 'Novo educador'}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Educadores', to: '/educadores' },
          { label: isEdit ? 'Editar' : 'Novo' },
        ]}
      />

      {save.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractErrorMessage(save.error)}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <SectionCard title="Dados pessoais">
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormTextField name="nome" control={control} label="Nome completo" required />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormSelect
                name="cargo"
                control={control}
                label="Cargo"
                required
                options={[
                  { value: 'EDUCADOR', label: 'Educador' },
                  { value: 'COORDENADOR', label: 'Coordenador' },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormCheckbox name="ativo" control={control} label="Ativo" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="email" control={control} label="E-mail" type="email" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="telefone" control={control} label="Telefone" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="formacao" control={control} label="Formação" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField
                name="externalUserId"
                control={control}
                label="ID do usuário na Central (opcional)"
                helperText="Preencha se este educador também acessa o sistema via Central de Acessos."
              />
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ mt: 2 }}>
          <SectionCard title="Observações">
            <FormTextField
              name="observacoes"
              control={control}
              label="Observações"
              multiline
              minRows={3}
            />
          </SectionCard>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button onClick={() => navigate('/educadores')} disabled={save.isPending}>
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

function removeEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== '' && v !== undefined && v !== null) out[k] = v;
  }
  return out as T;
}

function extractErrorMessage(err: unknown): string {
  type ErrShape = { response?: { data?: { message?: string | string[] } } };
  const m = (err as ErrShape | null)?.response?.data?.message;
  if (Array.isArray(m)) return m.join('; ');
  return m ?? 'Falha ao salvar.';
}
