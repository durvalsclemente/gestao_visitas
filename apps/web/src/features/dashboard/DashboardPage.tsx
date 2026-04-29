import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import GavelIcon from '@mui/icons-material/Gavel';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RepeatIcon from '@mui/icons-material/Repeat';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import {
  HBarList,
  PageHeader,
  SectionCard,
  SummaryCard,
} from '../../shared/ui';
import { dashboardApi } from './api';

export function DashboardPage() {
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const sixMonthsAgo = useMemo(
    () => dayjs().subtract(6, 'month').startOf('day').format('YYYY-MM-DD'),
    [],
  );

  const [from, setFrom] = useState(sixMonthsAgo);
  const [to, setTo] = useState(today);

  const metrics = useQuery({
    queryKey: ['dashboard', { from, to }],
    queryFn: () => dashboardApi.metrics({ from, to }),
  });

  const data = metrics.data;
  const totals = data?.totals;

  const taxaPrazo = useMemo(() => {
    if (!totals) return null;
    const denom = totals.visitasNoPrazo + totals.visitasForaDoPrazo;
    if (denom === 0) return null;
    return Math.round((totals.visitasNoPrazo / denom) * 1000) / 10;
  }, [totals]);

  return (
    <>
      <PageHeader
        title="Dashboard gerencial"
        subtitle="Indicadores consolidados da organização"
        actions={
          <Stack direction="row" spacing={1}>
            <TextField
              label="De"
              type="date"
              size="small"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Até"
              type="date"
              size="small"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        }
      />

      {metrics.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Falha ao carregar indicadores.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Solicitações no período"
            value={totals?.solicitacoesNoPeriodo ?? 0}
            icon={<AssignmentIcon />}
            color="primary"
            loading={metrics.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Visitas agendadas"
            value={totals?.visitasAgendadas ?? 0}
            helperText={`${totals?.visitasRealizadas ?? 0} realizadas`}
            icon={<EventNoteIcon />}
            color="info"
            loading={metrics.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Relatórios concluídos"
            value={totals?.relatoriosFinalizados ?? 0}
            icon={<DoneAllIcon />}
            color="success"
            loading={metrics.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Tempo médio até visita"
            value={
              totals?.tempoMedioSolicitacaoVisitaDias != null
                ? `${totals.tempoMedioSolicitacaoVisitaDias} dias`
                : '—'
            }
            icon={<AccessTimeIcon />}
            color="warning"
            loading={metrics.isLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Casos abertos"
            value={totals?.casosAbertos ?? 0}
            icon={<PendingActionsIcon />}
            color="warning"
            loading={metrics.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Casos encerrados (período)"
            value={totals?.casosEncerrados ?? 0}
            icon={<ListAltIcon />}
            color="success"
            loading={metrics.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Encaminhamentos"
            value={totals?.encaminhamentos ?? 0}
            helperText="Triagens encaminhadas a outro setor"
            icon={<CallSplitIcon />}
            color="info"
            loading={metrics.isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Reincidências"
            value={totals?.reincidencias ?? 0}
            helperText="Assistidos com mais de uma solicitação"
            icon={<RepeatIcon />}
            color="error"
            loading={metrics.isLoading}
          />
        </Grid>

        <Grid item xs={12}>
          <SectionCard
            title="Visitas no prazo"
            actions={
              taxaPrazo != null && (
                <Chip
                  size="small"
                  color={taxaPrazo >= 80 ? 'success' : taxaPrazo >= 60 ? 'warning' : 'error'}
                  label={`${taxaPrazo}% no prazo`}
                />
              )
            }
          >
            {!totals ? (
              <Typography variant="body2" color="text.secondary">
                Carregando…
              </Typography>
            ) : totals.visitasNoPrazo + totals.visitasForaDoPrazo === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Nenhuma visita realizada com prazo recomendado pela triagem no período.
              </Typography>
            ) : (
              <HBarList
                items={[
                  {
                    label: 'Realizadas no prazo',
                    value: totals.visitasNoPrazo,
                    color: '#2E8B57',
                  },
                  {
                    label: 'Realizadas fora do prazo',
                    value: totals.visitasForaDoPrazo,
                    color: '#D14343',
                  },
                ]}
              />
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ----- Séries e listas ----- */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard title="Solicitações por mês">
            <HBarList
              items={
                data?.solicitacoesPorPeriodo.map((b) => ({
                  label: dayjs(`${b.mes}-01`).format('MMM/YYYY'),
                  value: b.total,
                })) ?? []
              }
              emptyMessage="Sem solicitações no período."
            />
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Solicitações por motivo">
            <HBarList
              items={data?.solicitacoesPorMotivo ?? []}
              emptyMessage="Sem solicitações classificadas por motivo."
              maxItems={8}
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard title="Solicitações por programa / unidade">
            <HBarList
              items={data?.solicitacoesPorPrograma ?? []}
              emptyMessage="Sem solicitações vinculadas a programa."
              maxItems={8}
            />
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Visitas por criticidade (relatórios)">
            <HBarList
              items={(data?.visitasPorCriticidade ?? []).map((c) => ({
                ...c,
                color: criticidadeCor(c.label),
              }))}
              emptyMessage="Nenhum relatório finalizado no período."
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            title="Visitas por visitador"
            subtitle="Top 20 — total no período"
          >
            <HBarList
              items={
                data?.visitasPorVisitador.map((v) => ({
                  label: `${v.visitador} (${v.realizadas}/${v.total})`,
                  value: v.total,
                })) ?? []
              }
              emptyMessage="Sem visitas no período."
            />
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Casos abertos vs encerrados">
            <HBarList
              items={(data?.casosPorStatus ?? []).map((s) => ({
                ...s,
                color: statusCasoCor(s.label),
              }))}
              emptyMessage="Sem casos cadastrados."
            />
          </SectionCard>
        </Grid>

        <Grid item xs={12}>
          <SectionCard
            title="Reincidências (assistidos com mais de 1 solicitação)"
            actions={
              <Chip
                icon={<GavelIcon />}
                size="small"
                label={`${data?.reincidentesTopo.length ?? 0} no top 10`}
                variant="outlined"
              />
            }
          >
            <HBarList
              items={
                data?.reincidentesTopo.map((r) => ({
                  label: r.assistido,
                  value: r.total,
                })) ?? []
              }
              emptyMessage="Sem reincidências no período."
            />
          </SectionCard>
        </Grid>
      </Grid>

      {data && (
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Período: {dayjs(data.periodo.from).format('DD/MM/YYYY')} –{' '}
            {dayjs(data.periodo.to).format('DD/MM/YYYY')}
          </Typography>
        </Box>
      )}
    </>
  );
}

function criticidadeCor(label: string): string | undefined {
  switch (label) {
    case 'MUITO_ALTA':
      return '#7A1F1F';
    case 'ALTA':
      return '#D14343';
    case 'MEDIA':
      return '#F0A500';
    case 'BAIXA':
      return '#2E8B57';
    default:
      return undefined;
  }
}

function statusCasoCor(label: string): string | undefined {
  switch (label) {
    case 'ATIVO':
      return '#1F4E79';
    case 'EM_REVISAO':
      return '#F0A500';
    case 'CONCLUIDO':
      return '#2E8B57';
    case 'CANCELADO':
      return '#9E9E9E';
    case 'RASCUNHO':
      return '#B0BEC5';
    default:
      return undefined;
  }
}
