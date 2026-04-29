import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RelatorioVisita, Visita } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import type { CheckInDto } from './dto/check-in.dto';
import type { UpdateRelatorioVisitaDto } from './dto/update-relatorio.dto';
import type { NaoRealizadaDto } from './dto/nao-realizada.dto';

@Injectable()
export class RelatoriosVisitaService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Check-in ----------

  async checkIn(visitaId: string, dto: CheckInDto) {
    const { organizationId, externalUserId } = requireTenant();
    const visita = await this.loadVisitaEditavel(visitaId, organizationId);

    // Garante o relatório-rascunho.
    await this.prisma.relatorioVisita.upsert({
      where: { visitaId: visita.id },
      update: {},
      create: {
        organizationId,
        visitaId: visita.id,
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
    });

    return this.prisma.visita.update({
      where: { id: visita.id },
      data: {
        checkInEm: visita.checkInEm ?? new Date(),
        checkInPorExternalUserId: visita.checkInPorExternalUserId ?? externalUserId,
        checkInLatitude: dto.latitude ?? visita.checkInLatitude,
        checkInLongitude: dto.longitude ?? visita.checkInLongitude,
        updatedByExternalUserId: externalUserId,
      },
      include: { relatorio: true },
    });
  }

  // ---------- Leitura ----------

  async getRelatorio(visitaId: string): Promise<RelatorioVisita | null> {
    const { organizationId } = requireTenant();
    await this.assertVisita(visitaId, organizationId);
    return this.prisma.relatorioVisita.findUnique({
      where: { visitaId },
    });
  }

  // ---------- Salvamento parcial (rascunho) ----------

  async upsertRascunho(visitaId: string, dto: UpdateRelatorioVisitaDto) {
    const { organizationId, externalUserId } = requireTenant();
    const visita = await this.loadVisitaEditavel(visitaId, organizationId);
    this.assertNaoFinalizado(visita);

    return this.prisma.relatorioVisita.upsert({
      where: { visitaId: visita.id },
      create: {
        organizationId,
        visitaId: visita.id,
        ...this.toData(dto),
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
      update: {
        ...this.toData(dto),
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  // ---------- Finalização ----------

  async finalizar(visitaId: string, dto: UpdateRelatorioVisitaDto) {
    const { organizationId, externalUserId } = requireTenant();
    const visita = await this.loadVisitaEditavel(visitaId, organizationId);
    this.assertNaoFinalizado(visita);

    // Aplica o último patch antes de validar — permite finalizar com um
    // único POST contendo todo o estado.
    const merged = await this.prisma.relatorioVisita.upsert({
      where: { visitaId: visita.id },
      create: {
        organizationId,
        visitaId: visita.id,
        ...this.toData(dto),
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
      update: {
        ...this.toData(dto),
        updatedByExternalUserId: externalUserId,
      },
    });

    this.assertCompleto(merged);

    const visitaStatus = merged.situacao === 'NAO_REALIZADA' ? 'NAO_REALIZADA' : 'REALIZADA';
    const dataRealizada =
      merged.situacao === 'REALIZADA'
        ? (merged.dataExecucao ?? new Date())
        : undefined;

    const [relatorio] = await this.prisma.$transaction([
      this.prisma.relatorioVisita.update({
        where: { visitaId: visita.id },
        data: {
          finalizadoEm: new Date(),
          finalizadoPorExternalUserId: externalUserId,
          assinadoEm: merged.assinaturaImagem || merged.assinanteNome ? new Date() : undefined,
          updatedByExternalUserId: externalUserId,
        },
      }),
      this.prisma.visita.update({
        where: { id: visita.id },
        data: {
          status: visitaStatus,
          dataRealizada,
          updatedByExternalUserId: externalUserId,
        },
      }),
    ]);

    return relatorio;
  }

  // ---------- Atalho: marcar como NÃO realizada ----------

  async marcarNaoRealizada(visitaId: string, dto: NaoRealizadaDto) {
    const { organizationId, externalUserId } = requireTenant();
    const visita = await this.loadVisitaEditavel(visitaId, organizationId);
    this.assertNaoFinalizado(visita);

    const [relatorio] = await this.prisma.$transaction(async (tx) => {
      const r = await tx.relatorioVisita.upsert({
        where: { visitaId: visita.id },
        create: {
          organizationId,
          visitaId: visita.id,
          dataExecucao: new Date(),
          presencaFamilia: false,
          situacao: 'NAO_REALIZADA',
          motivoNaoRealizacao: dto.motivoNaoRealizacao,
          observacoesNaoRealizacao: dto.observacoesNaoRealizacao,
          finalizadoEm: new Date(),
          finalizadoPorExternalUserId: externalUserId,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
        update: {
          situacao: 'NAO_REALIZADA',
          motivoNaoRealizacao: dto.motivoNaoRealizacao,
          observacoesNaoRealizacao: dto.observacoesNaoRealizacao,
          finalizadoEm: new Date(),
          finalizadoPorExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
        },
      });

      await tx.visita.update({
        where: { id: visita.id },
        data: {
          status: 'NAO_REALIZADA',
          updatedByExternalUserId: externalUserId,
        },
      });

      return [r];
    });

    return relatorio;
  }

  // ---------- Helpers ----------

  private async assertVisita(visitaId: string, organizationId: string): Promise<void> {
    const exists = await this.prisma.visita.count({
      where: { id: visitaId, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Visita não encontrada');
  }

  private async loadVisitaEditavel(id: string, organizationId: string): Promise<Visita> {
    const v = await this.prisma.visita.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!v) throw new NotFoundException('Visita não encontrada');
    if (v.status === 'CANCELADA') {
      throw new ConflictException('Visita cancelada — execução não permitida');
    }
    return v;
  }

  private assertNaoFinalizado(visita: Visita): void {
    if (visita.status === 'REALIZADA' || visita.status === 'NAO_REALIZADA') {
      throw new ConflictException(
        `Visita já está com status "${visita.status}" — relatório não pode mais ser modificado.`,
      );
    }
  }

  /**
   * Validação para finalizar — depende da `situacao`.
   * Para NÃO REALIZADA basta motivo. Para REALIZADA exige um conjunto
   * mínimo de campos (presença, análise, criticidade, status, assinatura).
   */
  private assertCompleto(r: RelatorioVisita): void {
    if (!r.situacao) {
      throw new BadRequestException('Defina a situação da visita antes de finalizar');
    }
    if (r.situacao === 'NAO_REALIZADA') {
      if (!r.motivoNaoRealizacao) {
        throw new BadRequestException('Informe o motivo da não realização');
      }
      return;
    }
    const faltando: string[] = [];
    if (!r.dataExecucao) faltando.push('dataExecucao');
    if (!r.analiseTecnica) faltando.push('analiseTecnica');
    if (!r.recomendacoes) faltando.push('recomendacoes');
    if (!r.criticidadeFinal) faltando.push('criticidadeFinal');
    if (!r.statusCaso) faltando.push('statusCaso');
    if (!r.assinanteNome) faltando.push('assinanteNome');
    if (!r.assinaturaImagem) faltando.push('assinaturaImagem');
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Campos obrigatórios para finalizar: ${faltando.join(', ')}`,
      );
    }
  }

  private toData(dto: UpdateRelatorioVisitaDto): Prisma.RelatorioVisitaUncheckedUpdateInput {
    return {
      ...(dto.dataExecucao !== undefined ? { dataExecucao: new Date(dto.dataExecucao) } : {}),
      ...(dto.horaInicio !== undefined ? { horaInicio: dto.horaInicio } : {}),
      ...(dto.horaFim !== undefined ? { horaFim: dto.horaFim } : {}),
      ...(dto.presencaFamilia !== undefined ? { presencaFamilia: dto.presencaFamilia } : {}),
      ...(dto.situacao !== undefined ? { situacao: dto.situacao } : {}),
      ...(dto.motivoNaoRealizacao !== undefined
        ? { motivoNaoRealizacao: dto.motivoNaoRealizacao }
        : {}),
      ...(dto.observacoesNaoRealizacao !== undefined
        ? { observacoesNaoRealizacao: dto.observacoesNaoRealizacao }
        : {}),
      ...(dto.condicoesResidencia !== undefined
        ? { condicoesResidencia: dto.condicoesResidencia }
        : {}),
      ...(dto.composicaoFamiliar !== undefined
        ? { composicaoFamiliar: dto.composicaoFamiliar as Prisma.InputJsonValue }
        : {}),
      ...(dto.higiene !== undefined ? { higiene: dto.higiene } : {}),
      ...(dto.alimentacao !== undefined ? { alimentacao: dto.alimentacao } : {}),
      ...(dto.condicoesEmocionais !== undefined
        ? { condicoesEmocionais: dto.condicoesEmocionais }
        : {}),
      ...(dto.relacoesFamiliares !== undefined
        ? { relacoesFamiliares: dto.relacoesFamiliares }
        : {}),
      ...(dto.redeApoio !== undefined ? { redeApoio: dto.redeApoio } : {}),
      ...(dto.vulnerabilidade !== undefined ? { vulnerabilidade: dto.vulnerabilidade } : {}),
      ...(dto.comportamentoAssistido !== undefined
        ? { comportamentoAssistido: dto.comportamentoAssistido }
        : {}),
      ...(dto.relatos !== undefined ? { relatos: dto.relatos } : {}),
      ...(dto.dificuldades !== undefined ? { dificuldades: dto.dificuldades } : {}),
      ...(dto.impactosOsc !== undefined ? { impactosOsc: dto.impactosOsc } : {}),
      ...(dto.analiseTecnica !== undefined ? { analiseTecnica: dto.analiseTecnica } : {}),
      ...(dto.fatoresAgravantes !== undefined
        ? { fatoresAgravantes: dto.fatoresAgravantes }
        : {}),
      ...(dto.fatoresProtetivos !== undefined
        ? { fatoresProtetivos: dto.fatoresProtetivos }
        : {}),
      ...(dto.recomendacoes !== undefined ? { recomendacoes: dto.recomendacoes } : {}),
      ...(dto.planoInicial !== undefined ? { planoInicial: dto.planoInicial } : {}),
      ...(dto.criticidadeFinal !== undefined
        ? { criticidadeFinal: dto.criticidadeFinal }
        : {}),
      ...(dto.statusCaso !== undefined ? { statusCaso: dto.statusCaso } : {}),
      ...(dto.assinanteNome !== undefined ? { assinanteNome: dto.assinanteNome } : {}),
      ...(dto.assinaturaImagem !== undefined
        ? { assinaturaImagem: dto.assinaturaImagem }
        : {}),
    };
  }
}
