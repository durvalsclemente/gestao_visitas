import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GavelIcon from '@mui/icons-material/Gavel';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ListAltIcon from '@mui/icons-material/ListAlt';
import dayjs from 'dayjs';
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatusChip,
  SummaryCard,
  type DataTableColumn,
} from '../../shared/ui';
import { programasApi } from '../configuracoes/api';
import { STATUS_MAPPING as VISITA_STATUS } from '../visitas/api';
import { STATUS_MAPPING as PLANO_STATUS } from '../planos-acao/api';
import { STATUS_MAPPING as SOL_STATUS } from '../solicitacoes-visita/status-helpers';
import { historicoApi } from './api';
import { DocumentosPanel } from '../documentos/DocumentosPanel';
import type {
  HistoricoAssistido,
  HistoricoAnexo,
  HistoricoPlano,
  HistoricoSolicitacao,
  HistoricoVisita,
  MatriculaAssistido,
} from './types';

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'matriculas', label: 'Matrículas' },
  { id: 'solicitacoes', label: 'Solicitações' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'planos', label: 'Planos' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'timeline', label: 'Linha do tempo' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function HistoricoAssistidoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('resumo');
  const [matriculaOpen, setMatriculaOpen] = useState(false);

  const historico = useQuery({
    queryKey: ['historico-assistido', id],
    queryFn: () => historicoApi.get(id!),
    enabled: !!id,
  });

  if (historico.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (historico.isError || !historico.data) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Assistido não encontrado ou inacessível para este tenant.
      </Alert>
    );
  }

  const h = historico.data;
  const a = h.assistido;
  const refetch = () => qc.invalidateQueries({ queryKey: ['historico-assistido', id] });

  return (
    <>
      <PageHeader
        title={a.nome}
        subtitle="Histórico 360º"
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Assistidos', to: '/assistidos' },
          { label: a.nome },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => navigate(`/assistidos/${a.id}`)}>Editar cadastro</Button>
            <Button
              variant="contained"
              startIcon={<ListAltIcon />}
              onClick={() =>
                navigate(`/planos-acao/novo?assistidoId=${a.id}`)
              }
            >
              Novo plano de ação
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Matrículas ativas"
            value={h.matriculas.filter((m) => m.ativa).length}
            icon={<SchoolIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Solicitações"
            value={h.solicitacoes.length}
            icon={<AssignmentIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Visitas realizadas"
            value={h.visitas.filter((v) => v.status === 'REALIZADA').length}
            helperText={`${h.visitas.length} no total`}
            icon={<EventNoteIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            label="Planos ativos"
            value={h.planosAcao.filter((p) => p.status === 'ATIVO').length}
            helperText={`${h.planosAcao.length} no total`}
            icon={<ListAltIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <SectionCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: -3, mt: -3, mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v: TabId) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
            aria-label="Abas do histórico do assistido"
          >
            {TABS.map((t) => (
              <Tab key={t.id} value={t.id} label={t.label} />
            ))}
          </Tabs>
        </Box>

        <Box role="tabpanel">
          {activeTab === 'resumo' && <ResumoTab historico={h} />}
          {activeTab === 'matriculas' && (
            <MatriculasTab
              matriculas={h.matriculas}
              onAdd={() => setMatriculaOpen(true)}
              onChanged={refetch}
            />
          )}
          {activeTab === 'solicitacoes' && (
            <SolicitacoesTab
              items={h.solicitacoes}
              onOpen={(s) => navigate(`/solicitacoes-visita/${s.id}`)}
            />
          )}
          {activeTab === 'visitas' && (
            <VisitasTab
              items={h.visitas}
              onOpen={(v) => navigate(`/visitas/${v.id}`)}
            />
          )}
          {activeTab === 'planos' && (
            <PlanosTab
              items={h.planosAcao}
              onOpen={(p) => navigate(`/planos-acao/${p.id}`)}
            />
          )}
          {activeTab === 'anexos' && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Documentos do assistido
                </Typography>
                <DocumentosPanel parent="assistido" parentId={a.id} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Anexos legados (visitas e solicitações)
                </Typography>
                <AnexosTab anexos={h.anexos} />
              </Box>
            </Stack>
          )}
          {activeTab === 'timeline' && <TimelineTab historico={h} navigate={navigate} />}
        </Box>
      </SectionCard>

      <MatriculaDialog
        open={matriculaOpen}
        assistidoId={a.id}
        onClose={() => setMatriculaOpen(false)}
        onSaved={() => {
          setMatriculaOpen(false);
          refetch();
        }}
      />
    </>
  );
}

// ---------- Resumo ----------

function ResumoTab({ historico }: { historico: HistoricoAssistido }) {
  const a = historico.assistido;
  const endereco = [a.endereco, a.bairro, a.cidade, a.uf].filter(Boolean).join(', ');

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <SectionCard title="Dados cadastrais">
          <Stack spacing={1}>
            <Field label="Nome" value={a.nome} />
            <Field label="CPF" value={a.cpf ?? '—'} />
            <Field
              label="Data de nascimento"
              value={a.dataNascimento ? dayjs(a.dataNascimento).format('DD/MM/YYYY') : '—'}
            />
            <Field label="Telefone" value={a.telefone ?? '—'} />
            <Field label="E-mail" value={a.email ?? '—'} />
            <Field label="Endereço" value={endereco || '—'} />
            <Field label="CEP" value={a.cep ?? '—'} />
            {a.observacoes && <Field label="Observações" value={a.observacoes} block />}
          </Stack>
        </SectionCard>
      </Grid>
      <Grid item xs={12} md={6}>
        <SectionCard title="Programas ativos">
          {historico.matriculas.filter((m) => m.ativa).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Nenhuma matrícula ativa.
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {historico.matriculas
                .filter((m) => m.ativa)
                .map((m) => (
                  <Stack key={m.id} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={m.programa.tipo} />
                    <Typography variant="body2">{m.programa.nome}</Typography>
                    {m.dataInicio && (
                      <Typography variant="caption" color="text.secondary">
                        desde {dayjs(m.dataInicio).format('DD/MM/YYYY')}
                      </Typography>
                    )}
                  </Stack>
                ))}
            </Stack>
          )}
        </SectionCard>
      </Grid>
    </Grid>
  );
}

// ---------- Matrículas ----------

function MatriculasTab({
  matriculas,
  onAdd,
  onChanged,
}: {
  matriculas: MatriculaAssistido[];
  onAdd: () => void;
  onChanged: () => void;
}) {
  const remove = useMutation({
    mutationFn: (id: string) => historicoApi.removeMatricula(id),
    onSuccess: onChanged,
  });

  const cols: DataTableColumn<MatriculaAssistido>[] = [
    {
      id: 'programa',
      label: 'Programa',
      render: (m) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={m.programa.tipo} />
          <Typography variant="body2">{m.programa.nome}</Typography>
        </Stack>
      ),
    },
    {
      id: 'dataInicio',
      label: 'Início',
      render: (m) => (m.dataInicio ? dayjs(m.dataInicio).format('DD/MM/YYYY') : '—'),
    },
    {
      id: 'dataFim',
      label: 'Fim',
      render: (m) => (m.dataFim ? dayjs(m.dataFim).format('DD/MM/YYYY') : '—'),
    },
    {
      id: 'ativa',
      label: 'Status',
      render: (m) => (
        <Chip
          size="small"
          label={m.ativa ? 'Ativa' : 'Encerrada'}
          color={m.ativa ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (m) => (
        <Tooltip title="Remover matrícula">
          <IconButton
            size="small"
            onClick={() => remove.mutate(m.id)}
            aria-label="Remover matrícula"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          Nova matrícula
        </Button>
      </Stack>
      <DataTable
        rows={matriculas}
        columns={cols}
        getRowId={(m) => m.id}
        emptyMessage="Sem matrículas registradas."
        ariaLabel="Matrículas do assistido"
      />
    </Box>
  );
}

function MatriculaDialog({
  open,
  assistidoId,
  onClose,
  onSaved,
}: {
  open: boolean;
  assistidoId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [programaId, setProgramaId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativa, setAtiva] = useState(true);

  const programas = useQuery({
    queryKey: ['programas', 'select-matricula'],
    queryFn: () => programasApi.list({ limit: 100, ativo: true }),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () =>
      historicoApi.createMatricula({
        assistidoId,
        programaId,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        observacoes: observacoes || undefined,
        ativa,
      }),
    onSuccess: () => {
      setProgramaId('');
      setDataInicio('');
      setDataFim('');
      setObservacoes('');
      setAtiva(true);
      onSaved();
    },
  });

  return (
    <Dialog open={open} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nova matrícula</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            select
            label="Programa"
            required
            value={programaId}
            onChange={(e) => setProgramaId(e.target.value)}
          >
            <MenuItem value=""><em>Selecione…</em></MenuItem>
            {(programas.data?.items ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome} · {p.tipo.toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Início"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <TextField
              label="Fim"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </Stack>
          <TextField
            label="Observações"
            multiline
            minRows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
            <Typography variant="body2">Matrícula ativa</Typography>
          </Stack>
          {save.isError && <Alert severity="error">Falha ao salvar matrícula.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!programaId || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Solicitações / Visitas / Planos ----------

function SolicitacoesTab({
  items,
  onOpen,
}: {
  items: HistoricoSolicitacao[];
  onOpen: (s: HistoricoSolicitacao) => void;
}) {
  const cols: DataTableColumn<HistoricoSolicitacao>[] = [
    {
      id: 'createdAt',
      label: 'Criada em',
      render: (s) => dayjs(s.createdAt).format('DD/MM/YYYY'),
    },
    { id: 'motivo', label: 'Motivo principal', render: (s) => s.motivoPrincipal?.nome ?? '—' },
    {
      id: 'prioridade',
      label: 'Prioridade',
      render: (s) =>
        s.prioridade ? (
          <Chip
            size="small"
            label={s.prioridade.nome}
            sx={{
              bgcolor: s.prioridade.cor ?? undefined,
              color: s.prioridade.cor ? '#fff' : undefined,
            }}
          />
        ) : (
          '—'
        ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (s) => <StatusChip status={s.status} mapping={SOL_STATUS} />,
    },
  ];
  return (
    <DataTable
      rows={items}
      columns={cols}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      emptyMessage="Sem solicitações registradas."
      ariaLabel="Solicitações do assistido"
    />
  );
}

function VisitasTab({
  items,
  onOpen,
}: {
  items: HistoricoVisita[];
  onOpen: (v: HistoricoVisita) => void;
}) {
  const cols: DataTableColumn<HistoricoVisita>[] = [
    {
      id: 'data',
      label: 'Data agendada',
      render: (v) => dayjs(v.dataAgendada).format('DD/MM/YYYY HH:mm'),
    },
    { id: 'tipo', label: 'Tipo', render: (v) => v.tipo },
    { id: 'visitador', label: 'Visitador', render: (v) => v.visitador.nome },
    {
      id: 'status',
      label: 'Status',
      render: (v) => <StatusChip status={v.status} mapping={VISITA_STATUS} />,
    },
    {
      id: 'criticidade',
      label: 'Criticidade',
      render: (v) => v.relatorio?.criticidadeFinal ?? '—',
    },
  ];
  return (
    <DataTable
      rows={items}
      columns={cols}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      emptyMessage="Sem visitas registradas."
      ariaLabel="Visitas do assistido"
    />
  );
}

function PlanosTab({
  items,
  onOpen,
}: {
  items: HistoricoPlano[];
  onOpen: (p: HistoricoPlano) => void;
}) {
  const cols: DataTableColumn<HistoricoPlano>[] = [
    {
      id: 'updatedAt',
      label: 'Atualizado',
      render: (p) => dayjs(p.updatedAt).format('DD/MM/YYYY'),
    },
    {
      id: 'objetivo',
      label: 'Objetivo',
      render: (p) => (
        <Typography
          variant="body2"
          sx={{
            maxWidth: 360,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p.objetivo}
        </Typography>
      ),
    },
    { id: 'area', label: 'Área', render: (p) => p.areaResponsavel ?? '—' },
    {
      id: 'status',
      label: 'Status',
      render: (p) => <StatusChip status={p.status} mapping={PLANO_STATUS} />,
    },
    {
      id: 'progresso',
      label: 'Ações',
      render: (p) => {
        const total = p.acoes.length;
        const done = p.acoes.filter((a) => a.concluida).length;
        return total === 0 ? '—' : `${done}/${total}`;
      },
    },
  ];
  return (
    <DataTable
      rows={items}
      columns={cols}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      emptyMessage="Sem planos de ação."
      ariaLabel="Planos de ação do assistido"
    />
  );
}

// ---------- Anexos ----------

function AnexosTab({
  anexos,
}: {
  anexos: { deVisitas: HistoricoAnexo[]; deSolicitacoes: HistoricoAnexo[] };
}) {
  const all = [
    ...anexos.deVisitas.map((a) => ({ ...a, _from: 'Visita' as const })),
    ...anexos.deSolicitacoes.map((a) => ({ ...a, _from: 'Solicitação' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (all.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Nenhum anexo registrado.
      </Typography>
    );
  }

  return (
    <List>
      {all.map((a) => (
        <ListItem key={`${a._from}-${a.id}`} divider>
          <ListItemIcon>
            <AttachFileIcon />
          </ListItemIcon>
          <ListItemText
            primary={
              <Link href={a.url} target="_blank" rel="noopener noreferrer" underline="hover">
                {a.nome}
              </Link>
            }
            secondary={
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={a._from} />
                <Typography variant="caption" color="text.secondary">
                  {a.mimeType} · {(a.tamanho / 1024).toFixed(1)} KB ·{' '}
                  {dayjs(a.createdAt).format('DD/MM/YYYY HH:mm')}
                </Typography>
              </Stack>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}

// ---------- Timeline ----------

interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  description?: string;
  badge?: string;
  href?: string;
  icon: React.ReactNode;
}

function TimelineTab({
  historico: h,
  navigate,
}: {
  historico: HistoricoAssistido;
  navigate: (path: string) => void;
}) {
  const events = useMemo(() => buildTimeline(h), [h]);

  if (events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Sem eventos registrados.
      </Typography>
    );
  }

  return (
    <Box sx={{ position: 'relative', pl: 4 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 11,
          top: 8,
          bottom: 8,
          width: 2,
          bgcolor: 'divider',
        }}
      />
      <Stack spacing={2.5}>
        {events.map((e) => (
          <Box key={e.id} sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                position: 'absolute',
                left: -28,
                top: 2,
                width: 24,
                height: 24,
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
              }}
            >
              {e.icon}
            </Avatar>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                {dayjs(e.at).format('DD/MM/YYYY HH:mm')}
              </Typography>
              {e.badge && <Chip size="small" label={e.badge} variant="outlined" />}
            </Stack>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mt: 0.25,
                cursor: e.href ? 'pointer' : 'default',
                '&:hover': e.href ? { color: 'primary.main' } : undefined,
              }}
              onClick={() => e.href && navigate(e.href)}
            >
              {e.title}
            </Typography>
            {e.description && (
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
              >
                {e.description}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function buildTimeline(h: HistoricoAssistido): TimelineEvent[] {
  const out: TimelineEvent[] = [];

  out.push({
    id: `cad-${h.assistido.id}`,
    at: h.assistido.createdAt,
    title: 'Cadastro do assistido',
    description: h.assistido.nome,
    icon: <PersonIcon sx={{ fontSize: 14 }} />,
  });

  for (const m of h.matriculas) {
    out.push({
      id: `matr-${m.id}`,
      at: m.dataInicio ?? m.createdAt,
      title: `Matriculado em ${m.programa.nome}`,
      badge: m.programa.tipo,
      icon: <SchoolIcon sx={{ fontSize: 14 }} />,
    });
  }

  for (const s of h.solicitacoes) {
    out.push({
      id: `sol-${s.id}`,
      at: s.createdAt,
      title: 'Solicitação criada',
      description: s.descricaoDetalhada.slice(0, 200),
      badge: s.motivoPrincipal?.nome,
      href: `/solicitacoes-visita/${s.id}`,
      icon: <AssignmentIcon sx={{ fontSize: 14 }} />,
    });
    for (const t of s.triagens) {
      out.push({
        id: `tri-${t.id}`,
        at: t.createdAt,
        title: `Triagem: ${t.decisao}`,
        description: t.justificativaTecnica.slice(0, 200),
        badge: t.complexidade,
        href: `/triagem/${s.id}`,
        icon: <GavelIcon sx={{ fontSize: 14 }} />,
      });
    }
  }

  for (const v of h.visitas) {
    out.push({
      id: `vis-create-${v.id}`,
      at: v.createdAt,
      title: 'Visita designada',
      description: v.visitador.nome,
      badge: v.tipo,
      href: `/visitas/${v.id}`,
      icon: <EventIcon sx={{ fontSize: 14 }} />,
    });
    if (v.dataRealizada) {
      out.push({
        id: `vis-realiz-${v.id}`,
        at: v.dataRealizada,
        title: `Visita ${v.status === 'REALIZADA' ? 'realizada' : v.status.toLowerCase()}`,
        description: v.relatorio?.recomendacoes?.slice(0, 200),
        badge: v.relatorio?.criticidadeFinal ?? undefined,
        href: `/visitas/${v.id}/relatorio`,
        icon: <HowToRegIcon sx={{ fontSize: 14 }} />,
      });
    } else if (v.confirmadaEm) {
      out.push({
        id: `vis-conf-${v.id}`,
        at: v.confirmadaEm,
        title: 'Visita confirmada',
        href: `/visitas/${v.id}`,
        icon: <EventIcon sx={{ fontSize: 14 }} />,
      });
    }
  }

  for (const p of h.planosAcao) {
    out.push({
      id: `plan-${p.id}`,
      at: p.createdAt,
      title: 'Plano de ação criado',
      description: p.objetivo,
      badge: p.areaResponsavel ?? undefined,
      href: `/planos-acao/${p.id}`,
      icon: <ListAltIcon sx={{ fontSize: 14 }} />,
    });
    for (const a of p.acoes) {
      if (a.concluidaEm) {
        out.push({
          id: `plan-acao-${a.id}`,
          at: a.concluidaEm,
          title: 'Ação concluída',
          description: a.descricao,
          href: `/planos-acao/${p.id}`,
          icon: <ListAltIcon sx={{ fontSize: 14 }} />,
        });
      }
    }
    for (const c of p.acompanhamentos) {
      out.push({
        id: `plan-acomp-${c.id}`,
        at: c.createdAt,
        title: c.encerraCaso ? 'Caso encerrado' : 'Acompanhamento registrado',
        description: c.evolucao.slice(0, 200),
        badge: c.necessitaNovaVisita ? 'nova visita' : undefined,
        href: `/planos-acao/${p.id}`,
        icon: <DescriptionIcon sx={{ fontSize: 14 }} />,
      });
    }
  }

  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ---------- Util ----------

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
