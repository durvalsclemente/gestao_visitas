import { Chip, Grid } from '@mui/material';
import {
  FormCheckbox,
  FormSelect,
  FormTextField,
} from '../../../shared/ui';
import { LookupAdmin } from '../LookupAdmin';
import { programasApi, type Programa, type ProgramaForm, type ProgramaTipo } from '../api';

const TIPO_LABEL: Record<ProgramaTipo, string> = {
  ATIVIDADE: 'Atividade',
  CURSO: 'Curso',
  PROJETO: 'Projeto',
};

const DEFAULTS: ProgramaForm = {
  nome: '',
  codigo: '',
  tipo: 'ATIVIDADE',
  descricao: '',
  cor: '',
  cargaHoraria: undefined,
  ativo: true,
};

export function ProgramasPanel() {
  return (
    <LookupAdmin<Programa, ProgramaForm>
      queryKey="programas"
      client={programasApi}
      emptyValues={DEFAULTS}
      entityLabel="programa"
      toFormValues={(r) => ({
        nome: r.nome,
        codigo: r.codigo ?? '',
        tipo: r.tipo,
        descricao: r.descricao ?? '',
        cor: r.cor ?? '',
        cargaHoraria: r.cargaHoraria ?? undefined,
        ativo: r.ativo,
      })}
      extraColumns={[
        {
          id: 'tipo',
          label: 'Tipo',
          render: (r) => <Chip label={TIPO_LABEL[r.tipo]} size="small" />,
        },
        { id: 'codigo', label: 'Código', render: (r) => r.codigo ?? '—' },
        {
          id: 'cargaHoraria',
          label: 'Carga horária',
          render: (r) => (r.cargaHoraria ? `${r.cargaHoraria}h` : '—'),
        },
      ]}
      renderFormFields={({ control }) => (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <FormTextField name="nome" control={control} label="Nome" required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormSelect
              name="tipo"
              control={control}
              label="Tipo"
              required
              options={[
                { value: 'ATIVIDADE', label: 'Atividade' },
                { value: 'CURSO', label: 'Curso' },
                { value: 'PROJETO', label: 'Projeto' },
              ]}
            />
          </Grid>
          <Grid item xs={6}>
            <FormTextField name="codigo" control={control} label="Código" />
          </Grid>
          <Grid item xs={6}>
            <FormTextField name="cor" control={control} label="Cor (HEX)" />
          </Grid>
          <Grid item xs={6}>
            <FormTextField
              name="cargaHoraria"
              control={control}
              label="Carga horária (h)"
              type="number"
            />
          </Grid>
          <Grid item xs={6}>
            <FormCheckbox name="ativo" control={control} label="Ativo" />
          </Grid>
          <Grid item xs={12}>
            <FormTextField
              name="descricao"
              control={control}
              label="Descrição"
              multiline
              minRows={2}
            />
          </Grid>
        </Grid>
      )}
    />
  );
}
