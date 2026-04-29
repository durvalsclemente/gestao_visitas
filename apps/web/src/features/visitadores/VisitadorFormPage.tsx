import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Grid, Stack } from '@mui/material';
import {
  FormCheckbox,
  FormTextField,
  PageHeader,
  SectionCard,
} from '../../shared/ui';
import { visitadoresApi } from './api';
import type { VisitadorFormValues } from './types';

const EMPTY: VisitadorFormValues = {
  nome: '',
  email: '',
  telefone: '',
  ativo: true,
  observacoes: '',
  externalUserId: '',
};

export function VisitadorFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'novo';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { control, handleSubmit, reset } = useForm<VisitadorFormValues>({ defaultValues: EMPTY });

  const detail = useQuery({
    queryKey: ['visitadores', id],
    queryFn: () => visitadoresApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (detail.data) {
      reset({
        nome: detail.data.nome,
        email: detail.data.email ?? '',
        telefone: detail.data.telefone ?? '',
        ativo: detail.data.ativo,
        observacoes: detail.data.observacoes ?? '',
        externalUserId: detail.data.externalUserId ?? '',
      });
    }
  }, [detail.data, reset]);

  const save = useMutation({
    mutationFn: (values: VisitadorFormValues) => {
      const cleaned = removeEmpty(values);
      return isEdit ? visitadoresApi.update(id!, cleaned) : visitadoresApi.create(cleaned);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitadores'] });
      navigate('/visitadores');
    },
  });

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar visitador' : 'Novo visitador'}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Visitadores', to: '/visitadores' },
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
              <FormCheckbox name="ativo" control={control} label="Ativo" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="email" control={control} label="E-mail" type="email" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="telefone" control={control} label="Telefone" />
            </Grid>
            <Grid item xs={12}>
              <FormTextField
                name="externalUserId"
                control={control}
                label="ID do usuário na Central (opcional)"
                helperText="Vincule se este visitador também acessa o sistema."
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
          <Button onClick={() => navigate('/visitadores')} disabled={save.isPending}>
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
