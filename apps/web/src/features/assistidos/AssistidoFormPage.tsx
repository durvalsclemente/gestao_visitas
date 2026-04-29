import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Grid, Stack } from '@mui/material';
import {
  FormDatePicker,
  FormTextField,
  PageHeader,
  SectionCard,
} from '../../shared/ui';
import { assistidosApi } from './api';
import type { AssistidoFormValues } from './types';

const EMPTY: AssistidoFormValues = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  telefone: '',
  email: '',
  endereco: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  observacoes: '',
};

export function AssistidoFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'novo';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { control, handleSubmit, reset } = useForm<AssistidoFormValues>({ defaultValues: EMPTY });

  const detail = useQuery({
    queryKey: ['assistidos', id],
    queryFn: () => assistidosApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (detail.data) {
      reset({
        nome: detail.data.nome,
        cpf: detail.data.cpf ?? '',
        dataNascimento: detail.data.dataNascimento ?? '',
        telefone: detail.data.telefone ?? '',
        email: detail.data.email ?? '',
        endereco: detail.data.endereco ?? '',
        bairro: detail.data.bairro ?? '',
        cidade: detail.data.cidade ?? '',
        uf: detail.data.uf ?? '',
        cep: detail.data.cep ?? '',
        observacoes: detail.data.observacoes ?? '',
      });
    }
  }, [detail.data, reset]);

  const save = useMutation({
    mutationFn: (values: AssistidoFormValues) => {
      const cleaned = removeEmpty(values);
      return isEdit ? assistidosApi.update(id!, cleaned) : assistidosApi.create(cleaned);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistidos'] });
      navigate('/assistidos');
    },
  });

  return (
    <>
      <PageHeader
        title={isEdit ? 'Editar assistido' : 'Novo assistido'}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Assistidos', to: '/assistidos' },
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
              <FormTextField name="cpf" control={control} label="CPF" placeholder="000.000.000-00" />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormDatePicker name="dataNascimento" control={control} label="Data de nascimento" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="email" control={control} label="E-mail" type="email" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormTextField name="telefone" control={control} label="Telefone" />
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ mt: 2 }}>
          <SectionCard title="Endereço">
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <FormTextField name="endereco" control={control} label="Logradouro" />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormTextField name="bairro" control={control} label="Bairro" />
              </Grid>
              <Grid item xs={12} md={5}>
                <FormTextField name="cidade" control={control} label="Cidade" />
              </Grid>
              <Grid item xs={6} md={2}>
                <FormTextField name="uf" control={control} label="UF" inputProps={{ maxLength: 2 }} />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormTextField name="cep" control={control} label="CEP" />
              </Grid>
            </Grid>
          </SectionCard>
        </Box>

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
          <Button onClick={() => navigate('/assistidos')} disabled={save.isPending}>
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
