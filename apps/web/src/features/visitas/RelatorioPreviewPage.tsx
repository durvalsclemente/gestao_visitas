import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import { PageHeader } from '../../shared/ui';
import {
  relatorioPdfApi,
  type RelatorioDadosPayload,
  type RelatorioModo,
} from './relatorio.api';

export function RelatorioPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modo, setModo] = useState<RelatorioModo>('completo');

  const dados = useQuery({
    queryKey: ['visitas', id, 'relatorio-dados'],
    queryFn: () => relatorioPdfApi.dados(id!),
    enabled: !!id,
  });

  if (dados.isLoading) return <Typography sx={{ p: 3 }}>Carregando…</Typography>;
  if (dados.isError || !dados.data) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Visita não encontrada ou inacessível para este tenant.
      </Alert>
    );
  }

  const v = dados.data;

  return (
    <>
      <PageHeader
        title="Relatório institucional"
        subtitle={v.assistido.nome}
        breadcrumbs={[
          { label: 'Início', to: '/' },
          { label: 'Agenda', to: '/agenda' },
          { label: 'Visita', to: `/visitas/${id}` },
          { label: 'Relatório' },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/visitas/${id}`)}>
              Voltar
            </Button>
            <Button
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              className="no-print"
            >
              Imprimir
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => relatorioPdfApi.download(id!, modo)}
              className="no-print"
            >
              Baixar PDF
            </Button>
          </Stack>
        }
      />

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 2 }}
        className="no-print"
      >
        <Typography variant="body2" color="text.secondary">
          Versão:
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={modo}
          onChange={(_, v) => v && setModo(v)}
          aria-label="Versão do relatório"
        >
          <ToggleButton value="resumido">Resumido</ToggleButton>
          <ToggleButton value="completo">Completo</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 4 },
          borderRadius: 2,
          maxWidth: 820,
          mx: 'auto',
          '@media print': { boxShadow: 'none', border: 'none', p: 0 },
        }}
      >
        <ReportContent dados={v} modo={modo} />
      </Paper>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </>
  );
}

function ReportContent({
  dados: v,
  modo,
}: {
  dados: RelatorioDadosPayload;
  modo: RelatorioModo;
}) {
  const sol = v.solicitacoes[0];
  const triagem = sol?.triagens[0];
  const r = v.relatorio;
  const enderecoAssistido = [
    v.assistido.endereco,
    v.assistido.bairro,
    v.assistido.cidade,
    v.assistido.uf,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Box sx={{ color: 'text.primary' }}>
      {/* Cabeçalho institucional */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {v.tenant.orgName ?? 'Organização da Sociedade Civil'}
          </Typography>
          {v.tenant.cnpj && (
            <Typography variant="caption" color="text.secondary">
              CNPJ: {v.tenant.cnpj}
            </Typography>
          )}
        </Box>
        <Chip label={modo === 'resumido' ? 'Versão resumida' : 'Versão completa'} size="small" />
      </Stack>
      <Divider sx={{ my: 2, borderColor: 'primary.main', borderBottomWidth: 2 }} />
      <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 3 }}>
        Relatório de Visita Domiciliar
      </Typography>

      <Section title="Identificação">
        <KV label="Assistido" value={v.assistido.nome} />
        {v.assistido.cpf && <KV label="CPF" value={v.assistido.cpf} />}
        {enderecoAssistido && <KV label="Endereço" value={enderecoAssistido} />}
        <KV label="Tipo de visita" value={v.tipo} />
        <KV label="Status" value={v.status} />
        <KV label="Data agendada" value={dayjs(v.dataAgendada).format('DD/MM/YYYY HH:mm')} />
        {v.dataRealizada && (
          <KV label="Data realizada" value={dayjs(v.dataRealizada).format('DD/MM/YYYY HH:mm')} />
        )}
        <KV label="Visitador primário" value={v.visitador.nome} />
        {v.visitadorSecundario && (
          <KV label="Visitador secundário" value={v.visitadorSecundario.nome} />
        )}
        {v.endereco && <KV label="Endereço da visita" value={v.endereco} />}
      </Section>

      <Section title="Solicitação de origem">
        {!sol && <Muted>Esta visita não está vinculada a uma solicitação.</Muted>}
        {sol && (
          <>
            <KV label="Solicitante (externalUserId)" value={sol.solicitanteExternalUserId} />
            <KV label="Motivo principal" value={sol.motivoPrincipal?.nome ?? '—'} />
            {sol.motivosSecundarios.length > 0 && (
              <KV
                label="Motivos secundários"
                value={sol.motivosSecundarios.map((m) => m.nome).join(', ')}
              />
            )}
            {sol.programa && (
              <KV label="Programa" value={`${sol.programa.nome} (${sol.programa.tipo})`} />
            )}
            {sol.prioridade && (
              <KV
                label="Prioridade"
                value={`${sol.prioridade.nome} (nível ${sol.prioridade.nivel})`}
              />
            )}
            <KV label="Risco imediato" value={sol.riscoImediato ? 'Sim' : 'Não'} />
            <KV
              label="Necessidade de avaliação técnica"
              value={sol.necessidadeAvaliacaoTecnica ? 'Sim' : 'Não'}
            />
            <KV label="Frequência" value={sol.frequencia} />
            <KV
              label="Data do fato gerador"
              value={dayjs(sol.dataFatoGerador).format('DD/MM/YYYY')}
            />
            <Paragraph label="Descrição detalhada" value={sol.descricaoDetalhada} />
            {sol.acoesJaRealizadas && (
              <Paragraph label="Ações já realizadas" value={sol.acoesJaRealizadas} />
            )}
          </>
        )}
      </Section>

      {modo === 'completo' && (
        <Section title="Triagem técnica">
          {!triagem && <Muted>Sem triagem registrada.</Muted>}
          {triagem && (
            <>
              <KV label="Triador (externalUserId)" value={triagem.triadorExternalUserId} />
              <KV label="Complexidade" value={triagem.complexidade} />
              <KV label="Decisão" value={triagem.decisao} />
              {triagem.tipoAtendimentoIndicado && (
                <KV label="Tipo de atendimento" value={triagem.tipoAtendimentoIndicado} />
              )}
              {(triagem.necessidadeDuplaVisita ||
                triagem.necessidadePsicologo ||
                triagem.necessidadeAssistenteSocial) && (
                <KV
                  label="Necessidades indicadas"
                  value={[
                    triagem.necessidadeDuplaVisita ? 'Dupla visita' : null,
                    triagem.necessidadePsicologo ? 'Psicólogo' : null,
                    triagem.necessidadeAssistenteSocial ? 'Assistente social' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                />
              )}
              {triagem.dataLimiteRecomendada && (
                <KV
                  label="Data limite"
                  value={dayjs(triagem.dataLimiteRecomendada).format('DD/MM/YYYY')}
                />
              )}
              {triagem.prioridadeReclassificada && (
                <KV
                  label="Prioridade reclassificada"
                  value={`${triagem.prioridadeReclassificada.nome} (nível ${triagem.prioridadeReclassificada.nivel})`}
                />
              )}
              {triagem.setorEncaminhamento && (
                <KV label="Setor de encaminhamento" value={triagem.setorEncaminhamento.nome} />
              )}
              <Paragraph label="Justificativa técnica" value={triagem.justificativaTecnica} />
            </>
          )}
        </Section>
      )}

      {modo === 'completo' && r && (
        <Section title="Execução da visita">
          {r.dataExecucao && (
            <KV label="Data de execução" value={dayjs(r.dataExecucao).format('DD/MM/YYYY')} />
          )}
          {(r.horaInicio || r.horaFim) && (
            <KV
              label="Horário"
              value={`${r.horaInicio ?? '--:--'} – ${r.horaFim ?? '--:--'}`}
            />
          )}
          {v.checkInEm && (
            <KV label="Check-in" value={dayjs(v.checkInEm).format('DD/MM/YYYY HH:mm')} />
          )}
          <KV label="Presença da família" value={r.presencaFamilia ? 'Sim' : 'Não'} />
          <KV label="Situação" value={r.situacao ?? '—'} />
          {r.situacao === 'NAO_REALIZADA' && (
            <>
              {r.motivoNaoRealizacao && (
                <KV label="Motivo da não realização" value={r.motivoNaoRealizacao} />
              )}
              {r.observacoesNaoRealizacao && (
                <Paragraph label="Observações" value={r.observacoesNaoRealizacao} />
              )}
            </>
          )}

          {r.composicaoFamiliar && r.composicaoFamiliar.length > 0 && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <SubLabel>Composição familiar</SubLabel>
              <Box component="ul" sx={{ pl: 3, mt: 0.5 }}>
                {r.composicaoFamiliar.map((m, i) => (
                  <li key={i}>
                    <Typography variant="body2">
                      {m.nome}
                      {m.idade ? `, ${m.idade} anos` : ''}
                      {m.vinculo ? ` — ${m.vinculo}` : ''}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}

          <Grid container spacing={1.5}>
            {(
              [
                ['condicoesResidencia', 'Condições da residência'],
                ['higiene', 'Higiene'],
                ['alimentacao', 'Alimentação'],
                ['condicoesEmocionais', 'Condições emocionais'],
                ['relacoesFamiliares', 'Relações familiares'],
                ['redeApoio', 'Rede de apoio'],
                ['vulnerabilidade', 'Vulnerabilidade'],
                ['comportamentoAssistido', 'Comportamento do assistido'],
                ['relatos', 'Relatos'],
                ['dificuldades', 'Dificuldades'],
                ['impactosOsc', 'Impactos na OSC'],
                ['analiseTecnica', 'Análise técnica'],
                ['fatoresAgravantes', 'Fatores agravantes'],
                ['fatoresProtetivos', 'Fatores protetivos'],
              ] as const
            ).map(([key, label]) => {
              const val = r[key as keyof typeof r];
              if (typeof val !== 'string' || !val) return null;
              return (
                <Grid item xs={12} key={key}>
                  <Paragraph label={label} value={val} />
                </Grid>
              );
            })}
          </Grid>
        </Section>
      )}

      <Section title="Conclusão">
        {r?.recomendacoes && <Paragraph label="Recomendações" value={r.recomendacoes} />}
        {r?.planoInicial && <Paragraph label="Plano de ação inicial" value={r.planoInicial} />}
        {r?.criticidadeFinal && <KV label="Criticidade final" value={r.criticidadeFinal} />}
        {r?.statusCaso && <KV label="Status do caso" value={r.statusCaso} />}
        {triagem?.setorEncaminhamento && (
          <KV label="Encaminhamento sugerido" value={triagem.setorEncaminhamento.nome} />
        )}
      </Section>

      <Section title="Assinaturas">
        {r?.assinaturaImagem && r?.assinanteNome ? (
          <Box>
            <Box
              component="img"
              src={r.assinaturaImagem}
              alt={`Assinatura de ${r.assinanteNome}`}
              sx={{ maxWidth: 220, maxHeight: 80, display: 'block' }}
            />
            <Box
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                width: 220,
                mt: 0.5,
                pt: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {r.assinanteNome}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {r.assinadoEm
                  ? `Assinado em ${dayjs(r.assinadoEm).format('DD/MM/YYYY HH:mm')}`
                  : 'Assinado'}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Muted>Sem assinatura registrada.</Muted>
        )}

        <Stack direction="row" spacing={4} sx={{ mt: 4 }} flexWrap="wrap" useFlexGap>
          {[v.visitador, v.visitadorSecundario].filter(Boolean).map((vis, i) => (
            <Box key={i} sx={{ width: 220 }}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 4, pt: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {(vis as { nome: string }).nome}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  Visitador
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Section>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary" align="center" component="div">
        Relatório {modo === 'resumido' ? 'resumido' : 'completo'} · gerado em{' '}
        {dayjs().format('DD/MM/YYYY HH:mm')} · {v.tenant.orgName ?? 'OSC'}
      </Typography>
    </Box>
  );
}

// ---------- Subcomponentes visuais ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 3, breakInside: 'avoid' }}>
      <Typography
        variant="overline"
        sx={{
          fontWeight: 700,
          color: 'primary.main',
          letterSpacing: 1,
        }}
      >
        {title}
      </Typography>
      <Divider sx={{ borderColor: 'primary.main', mb: 1 }} />
      <Stack spacing={0.6}>{children}</Stack>
    </Box>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <Typography variant="body2">
      <strong>{label}:</strong> {value}
    </Typography>
  );
}

function Paragraph({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ mb: 1 }}>
      <SubLabel>{label}</SubLabel>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
        {value}
      </Typography>
    </Box>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {children}
    </Typography>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
      {children}
    </Typography>
  );
}
