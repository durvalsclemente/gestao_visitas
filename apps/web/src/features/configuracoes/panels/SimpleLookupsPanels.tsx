import { Grid } from '@mui/material';
import {
  FormCheckbox,
  FormSelect,
  FormTextField,
} from '../../../shared/ui';
import { LookupAdmin } from '../LookupAdmin';
import {
  motivosVisitaApi,
  prioridadesApi,
  statusApi,
  tiposEncaminhamentoApi,
  type LookupCommonForm,
  type LookupItem,
  type Prioridade,
  type PrioridadeForm,
  type StatusForm,
  type StatusItem,
} from '../api';

const SIMPLE_DEFAULTS: LookupCommonForm = {
  nome: '',
  codigo: '',
  cor: '',
  ordem: 0,
  ativo: true,
};

function SimpleLookupFields({ control }: { control: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = control as any;
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormTextField name="nome" control={c} label="Nome" required />
      </Grid>
      <Grid item xs={6}>
        <FormTextField name="codigo" control={c} label="Código" />
      </Grid>
      <Grid item xs={6}>
        <FormTextField name="cor" control={c} label="Cor (HEX)" placeholder="#1F4E79" />
      </Grid>
      <Grid item xs={6}>
        <FormTextField name="ordem" control={c} label="Ordem" type="number" />
      </Grid>
      <Grid item xs={6}>
        <FormCheckbox name="ativo" control={c} label="Ativo" />
      </Grid>
    </Grid>
  );
}

export function MotivosVisitaPanel() {
  return (
    <LookupAdmin<LookupItem, LookupCommonForm>
      queryKey="motivos-visita"
      client={motivosVisitaApi}
      emptyValues={SIMPLE_DEFAULTS}
      entityLabel="motivo de visita"
      toFormValues={(r) => ({
        nome: r.nome,
        codigo: r.codigo ?? '',
        cor: r.cor ?? '',
        ordem: r.ordem ?? 0,
        ativo: r.ativo,
      })}
      extraColumns={[{ id: 'codigo', label: 'Código', render: (r) => r.codigo ?? '—' }]}
      renderFormFields={SimpleLookupFields}
    />
  );
}

export function TiposEncaminhamentoPanel() {
  return (
    <LookupAdmin<LookupItem, LookupCommonForm>
      queryKey="tipos-encaminhamento"
      client={tiposEncaminhamentoApi}
      emptyValues={SIMPLE_DEFAULTS}
      entityLabel="tipo de encaminhamento"
      toFormValues={(r) => ({
        nome: r.nome,
        codigo: r.codigo ?? '',
        cor: r.cor ?? '',
        ordem: r.ordem ?? 0,
        ativo: r.ativo,
      })}
      extraColumns={[{ id: 'codigo', label: 'Código', render: (r) => r.codigo ?? '—' }]}
      renderFormFields={SimpleLookupFields}
    />
  );
}

const PRIORIDADE_DEFAULTS: PrioridadeForm = {
  nome: '',
  codigo: '',
  cor: '',
  nivel: 0,
  ativo: true,
};

export function PrioridadesPanel() {
  return (
    <LookupAdmin<Prioridade, PrioridadeForm>
      queryKey="prioridades"
      client={prioridadesApi}
      emptyValues={PRIORIDADE_DEFAULTS}
      entityLabel="prioridade"
      toFormValues={(r) => ({
        nome: r.nome,
        codigo: r.codigo ?? '',
        cor: r.cor ?? '',
        nivel: r.nivel,
        ativo: r.ativo,
      })}
      extraColumns={[
        { id: 'codigo', label: 'Código', render: (r) => r.codigo ?? '—' },
        { id: 'nivel', label: 'Nível', render: (r) => String(r.nivel) },
      ]}
      renderFormFields={({ control }) => (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormTextField name="nome" control={control} label="Nome" required />
          </Grid>
          <Grid item xs={6}>
            <FormTextField name="codigo" control={control} label="Código" />
          </Grid>
          <Grid item xs={6}>
            <FormTextField name="cor" control={control} label="Cor (HEX)" />
          </Grid>
          <Grid item xs={6}>
            <FormTextField
              name="nivel"
              control={control}
              label="Nível"
              type="number"
              helperText="Maior nível = maior prioridade"
            />
          </Grid>
          <Grid item xs={6}>
            <FormCheckbox name="ativo" control={control} label="Ativo" />
          </Grid>
        </Grid>
      )}
    />
  );
}

const STATUS_DEFAULTS: StatusForm = {
  nome: '',
  codigo: '',
  cor: '',
  categoria: 'VISITA',
  ordem: 0,
  ativo: true,
};

export function StatusPanel() {
  return (
    <LookupAdmin<StatusItem, StatusForm>
      queryKey="status"
      client={statusApi}
      emptyValues={STATUS_DEFAULTS}
      entityLabel="status"
      toFormValues={(r) => ({
        nome: r.nome,
        codigo: r.codigo ?? '',
        cor: r.cor ?? '',
        categoria: r.categoria ?? '',
        ordem: r.ordem ?? 0,
        ativo: r.ativo,
      })}
      extraColumns={[
        { id: 'categoria', label: 'Categoria', render: (r) => r.categoria ?? '—' },
        { id: 'codigo', label: 'Código', render: (r) => r.codigo ?? '—' },
      ]}
      renderFormFields={({ control }) => (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormTextField name="nome" control={control} label="Nome" required />
          </Grid>
          <Grid item xs={6}>
            <FormSelect
              name="categoria"
              control={control}
              label="Categoria"
              options={[
                { value: 'VISITA', label: 'Visita' },
                { value: 'ENCAMINHAMENTO', label: 'Encaminhamento' },
                { value: 'PROGRAMA', label: 'Programa' },
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
            <FormTextField name="ordem" control={control} label="Ordem" type="number" />
          </Grid>
          <Grid item xs={6}>
            <FormCheckbox name="ativo" control={control} label="Ativo" />
          </Grid>
        </Grid>
      )}
    />
  );
}
