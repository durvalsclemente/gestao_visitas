import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import type { RelatorioModo } from './dto/relatorio-pdf.dto';

const COLOR_PRIMARY = '#1F4E79';
const COLOR_TEXT = '#1F2937';
const COLOR_MUTED = '#6B7280';
const COLOR_LINE = '#D1D5DB';

/**
 * Gera relatório institucional da visita em PDF (e payload JSON
 * equivalente para preview no front).
 *
 * Toda leitura é gateada por organizationId — o serviço NUNCA
 * devolve dados de outro tenant, mesmo que o caller envie um
 * visitaId válido em outra OSC.
 */
@Injectable()
export class RelatorioPdfService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Loader único (compartilhado por preview e PDF) ----------

  async loadDados(visitaId: string) {
    const { organizationId } = requireTenant();

    const visita = await this.prisma.visita.findFirst({
      where: { id: visitaId, organizationId, deletedAt: null },
      include: {
        assistido: true,
        visitador: true,
        visitadorSecundario: true,
        relatorio: true,
        tenant: true,
        solicitacoes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            motivoPrincipal: { select: { id: true, nome: true } },
            motivosSecundarios: { select: { id: true, nome: true } },
            prioridade: { select: { id: true, nome: true, nivel: true } },
            programa: { select: { id: true, nome: true, tipo: true } },
            triagens: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                prioridadeReclassificada: { select: { nome: true, nivel: true } },
                setorEncaminhamento: { select: { nome: true } },
              },
            },
          },
        },
      },
    });

    if (!visita) throw new NotFoundException('Visita não encontrada');

    return visita;
  }

  // ---------- Geração do PDF ----------

  async gerarPdf(visitaId: string, modo: RelatorioModo = 'completo'): Promise<Buffer> {
    const v = await this.loadDados(visitaId);
    if (!v.relatorio) {
      throw new BadRequestException('Relatório ainda não foi iniciado para esta visita');
    }
    return this.render(v, modo);
  }

  private render(v: Awaited<ReturnType<typeof this.loadDados>>, modo: RelatorioModo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `Relatório de visita — ${v.assistido.nome}`,
          Author: v.tenant.orgName ?? 'Gestão de Visitas',
          Subject: 'Relatório institucional de visita domiciliar',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc, v);
      this.renderIdentificacao(doc, v);
      this.renderSolicitacao(doc, v);
      if (modo === 'completo') {
        this.renderTriagem(doc, v);
        this.renderExecucao(doc, v);
      }
      this.renderConclusao(doc, v);
      this.renderAssinatura(doc, v);
      this.renderFooter(doc, v, modo);

      doc.end();
    });
  }

  // ---------- Seções do PDF ----------

  private renderHeader(doc: PDFKit.PDFDocument, v: Awaited<ReturnType<typeof this.loadDados>>) {
    doc
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(v.tenant.orgName ?? 'Organização da Sociedade Civil', { align: 'left' });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLOR_MUTED);
    if (v.tenant.cnpj) doc.text(`CNPJ: ${v.tenant.cnpj}`);
    doc.moveDown(0.4);

    doc
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.6);
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(COLOR_TEXT)
      .text('Relatório de Visita Domiciliar', { align: 'center' });
    doc.moveDown(0.6);
  }

  private renderIdentificacao(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
  ) {
    this.sectionTitle(doc, 'Identificação');
    this.kv(doc, 'Assistido', v.assistido.nome);
    if (v.assistido.cpf) this.kv(doc, 'CPF', v.assistido.cpf);
    const enderecoAssistido = [
      v.assistido.endereco,
      v.assistido.bairro,
      v.assistido.cidade,
      v.assistido.uf,
    ]
      .filter(Boolean)
      .join(', ');
    if (enderecoAssistido) this.kv(doc, 'Endereço do assistido', enderecoAssistido);

    this.kv(doc, 'Tipo de visita', v.tipo);
    this.kv(doc, 'Status', v.status);
    this.kv(doc, 'Data agendada', formatDateTime(v.dataAgendada));
    if (v.dataRealizada) this.kv(doc, 'Data realizada', formatDateTime(v.dataRealizada));
    this.kv(doc, 'Visitador primário', v.visitador.nome);
    if (v.visitadorSecundario) {
      this.kv(doc, 'Visitador secundário', v.visitadorSecundario.nome);
    }
    if (v.endereco) this.kv(doc, 'Endereço da visita', v.endereco);
    doc.moveDown(0.3);
  }

  private renderSolicitacao(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
  ) {
    const sol = v.solicitacoes[0];
    this.sectionTitle(doc, 'Solicitação de origem');
    if (!sol) {
      this.muted(doc, 'Esta visita não está vinculada a uma solicitação.');
      return;
    }
    this.kv(doc, 'Solicitante (externalUserId)', sol.solicitanteExternalUserId);
    this.kv(doc, 'Motivo principal', sol.motivoPrincipal?.nome ?? '—');
    if (sol.motivosSecundarios.length > 0) {
      this.kv(
        doc,
        'Motivos secundários',
        sol.motivosSecundarios.map((m) => m.nome).join(', '),
      );
    }
    if (sol.programa) {
      this.kv(doc, 'Programa', `${sol.programa.nome} (${sol.programa.tipo})`);
    }
    if (sol.prioridade) {
      this.kv(doc, 'Prioridade', `${sol.prioridade.nome} (nível ${sol.prioridade.nivel})`);
    }
    this.kv(doc, 'Risco imediato', sol.riscoImediato ? 'Sim' : 'Não');
    this.kv(
      doc,
      'Necessidade de avaliação técnica',
      sol.necessidadeAvaliacaoTecnica ? 'Sim' : 'Não',
    );
    this.kv(doc, 'Data do fato gerador', formatDate(sol.dataFatoGerador));
    this.kv(doc, 'Frequência', sol.frequencia);
    if (sol.descricaoDetalhada) {
      this.paragraph(doc, 'Descrição detalhada', sol.descricaoDetalhada);
    }
    if (sol.acoesJaRealizadas) {
      this.paragraph(doc, 'Ações já realizadas', sol.acoesJaRealizadas);
    }
    doc.moveDown(0.3);
  }

  private renderTriagem(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
  ) {
    const sol = v.solicitacoes[0];
    const t = sol?.triagens[0];
    this.sectionTitle(doc, 'Triagem técnica');
    if (!t) {
      this.muted(doc, 'Sem triagem registrada para esta solicitação.');
      return;
    }
    this.kv(doc, 'Triador (externalUserId)', t.triadorExternalUserId);
    this.kv(doc, 'Complexidade', t.complexidade);
    this.kv(doc, 'Decisão', t.decisao);
    if (t.tipoAtendimentoIndicado) {
      this.kv(doc, 'Tipo de atendimento indicado', t.tipoAtendimentoIndicado);
    }
    const necessidades = [
      t.necessidadeDuplaVisita ? 'Dupla visita' : null,
      t.necessidadePsicologo ? 'Psicólogo' : null,
      t.necessidadeAssistenteSocial ? 'Assistente social' : null,
    ].filter(Boolean);
    if (necessidades.length > 0) {
      this.kv(doc, 'Necessidades indicadas', necessidades.join(', '));
    }
    if (t.dataLimiteRecomendada) {
      this.kv(doc, 'Data limite recomendada', formatDate(t.dataLimiteRecomendada));
    }
    if (t.prioridadeReclassificada) {
      this.kv(
        doc,
        'Prioridade reclassificada',
        `${t.prioridadeReclassificada.nome} (nível ${t.prioridadeReclassificada.nivel})`,
      );
    }
    if (t.setorEncaminhamento) {
      this.kv(doc, 'Setor de encaminhamento', t.setorEncaminhamento.nome);
    }
    if (t.justificativaTecnica) {
      this.paragraph(doc, 'Justificativa técnica', t.justificativaTecnica);
    }
    doc.moveDown(0.3);
  }

  private renderExecucao(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
  ) {
    const r = v.relatorio!;
    this.sectionTitle(doc, 'Execução da visita');
    if (r.dataExecucao) this.kv(doc, 'Data de execução', formatDate(r.dataExecucao));
    if (r.horaInicio || r.horaFim) {
      this.kv(doc, 'Horário', `${r.horaInicio ?? '--:--'} – ${r.horaFim ?? '--:--'}`);
    }
    if (v.checkInEm) this.kv(doc, 'Check-in', formatDateTime(v.checkInEm));
    this.kv(doc, 'Presença da família', r.presencaFamilia ? 'Sim' : 'Não');
    this.kv(doc, 'Situação', r.situacao ?? '—');
    if (r.situacao === 'NAO_REALIZADA') {
      if (r.motivoNaoRealizacao) this.kv(doc, 'Motivo da não realização', r.motivoNaoRealizacao);
      if (r.observacoesNaoRealizacao) {
        this.paragraph(doc, 'Observações', r.observacoesNaoRealizacao);
      }
      doc.moveDown(0.3);
      return;
    }

    const composicao = r.composicaoFamiliar as
      | { nome: string; idade?: number; vinculo?: string }[]
      | null
      | undefined;
    if (composicao && composicao.length > 0) {
      this.subTitle(doc, 'Composição familiar');
      for (const m of composicao) {
        const linha = `• ${m.nome}${m.idade ? `, ${m.idade} anos` : ''}${m.vinculo ? ` — ${m.vinculo}` : ''}`;
        doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT).text(linha, { indent: 10 });
      }
      doc.moveDown(0.4);
    }

    const pares: Array<[string, string | null | undefined]> = [
      ['Condições da residência', r.condicoesResidencia],
      ['Higiene', r.higiene],
      ['Alimentação', r.alimentacao],
      ['Condições emocionais', r.condicoesEmocionais],
      ['Relações familiares', r.relacoesFamiliares],
      ['Rede de apoio', r.redeApoio],
      ['Vulnerabilidade', r.vulnerabilidade],
      ['Comportamento do assistido', r.comportamentoAssistido],
      ['Relatos', r.relatos],
      ['Dificuldades', r.dificuldades],
      ['Impactos na OSC', r.impactosOsc],
      ['Análise técnica', r.analiseTecnica],
      ['Fatores agravantes', r.fatoresAgravantes],
      ['Fatores protetivos', r.fatoresProtetivos],
    ];
    for (const [label, val] of pares) {
      if (val) this.paragraph(doc, label, val);
    }
    doc.moveDown(0.3);
  }

  private renderConclusao(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
  ) {
    const r = v.relatorio;
    this.sectionTitle(doc, 'Conclusão');
    if (!r) {
      this.muted(doc, 'Sem relatório finalizado.');
      return;
    }
    if (r.recomendacoes) this.paragraph(doc, 'Recomendações', r.recomendacoes);
    if (r.planoInicial) this.paragraph(doc, 'Plano de ação inicial', r.planoInicial);

    if (r.criticidadeFinal) this.kv(doc, 'Criticidade final', r.criticidadeFinal);
    if (r.statusCaso) this.kv(doc, 'Status do caso', r.statusCaso);

    const sol = v.solicitacoes[0];
    const t = sol?.triagens[0];
    if (t?.setorEncaminhamento) {
      this.kv(doc, 'Encaminhamento sugerido', t.setorEncaminhamento.nome);
    }
    doc.moveDown(0.3);
  }

  private renderAssinatura(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
  ) {
    const r = v.relatorio;
    if (!r) return;
    this.sectionTitle(doc, 'Assinaturas');

    if (r.assinaturaImagem && r.assinanteNome) {
      try {
        const buf = dataUrlToBuffer(r.assinaturaImagem);
        if (buf) {
          const startY = doc.y;
          doc.image(buf, 50, startY, { fit: [180, 60] });
          doc.moveTo(50, startY + 65).lineTo(230, startY + 65).strokeColor(COLOR_LINE).stroke();
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COLOR_TEXT)
            .text(r.assinanteNome, 50, startY + 70);
          doc
            .fillColor(COLOR_MUTED)
            .text(
              r.assinadoEm ? `Assinado em ${formatDateTime(r.assinadoEm)}` : 'Assinado',
              50,
              startY + 84,
            );
          doc.moveDown(4);
        }
      } catch {
        // Falha ao decodificar a imagem: cai no fallback textual abaixo.
        this.kv(doc, 'Assinante', r.assinanteNome);
      }
    } else if (r.assinanteNome) {
      this.kv(doc, 'Assinante', r.assinanteNome);
    } else {
      this.muted(doc, 'Sem assinatura registrada.');
    }

    // Bloco de visitador(es)
    doc.moveDown(0.4);
    const visitadores = [v.visitador, v.visitadorSecundario].filter(Boolean) as Array<{
      nome: string;
    }>;
    for (const vis of visitadores) {
      doc.moveTo(doc.x, doc.y).lineTo(doc.x + 200, doc.y).strokeColor(COLOR_LINE).stroke();
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLOR_TEXT)
        .text(`${vis.nome} (visitador)`, { lineBreak: true });
      doc.moveDown(0.6);
    }
  }

  private renderFooter(
    doc: PDFKit.PDFDocument,
    v: Awaited<ReturnType<typeof this.loadDados>>,
    modo: RelatorioModo,
  ) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor(COLOR_MUTED);
      const text = `Relatório ${modo === 'resumido' ? 'resumido' : 'completo'} · gerado em ${formatDateTime(new Date())} · ${v.tenant.orgName ?? 'OSC'} · página ${i + 1} de ${range.count}`;
      doc.text(text, 50, 800, { width: 495, align: 'center', lineBreak: false });
    }
  }

  // ---------- Helpers visuais ----------

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_PRIMARY).text(title.toUpperCase());
    doc.strokeColor(COLOR_PRIMARY).lineWidth(0.8).moveTo(50, doc.y + 1).lineTo(545, doc.y + 1).stroke();
    doc.moveDown(0.4);
  }

  private subTitle(doc: PDFKit.PDFDocument, title: string) {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR_TEXT).text(title);
  }

  private kv(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(COLOR_TEXT)
      .text(`${label}: `, { continued: true });
    doc.font('Helvetica').fillColor(COLOR_TEXT).text(value);
  }

  private paragraph(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR_TEXT).text(label);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXT).text(value, {
      align: 'justify',
    });
    doc.moveDown(0.3);
  }

  private muted(doc: PDFKit.PDFDocument, value: string) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR_MUTED).text(value);
  }
}

// ---------- Helpers de formatação ----------

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = /^data:image\/(?:png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return Buffer.from(match[1], 'base64');
}
