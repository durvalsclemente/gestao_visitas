import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SolicitacaoVisitaStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import { paginate, type PaginatedResult } from '../../common/pagination/pagination.dto';
import type { CreateSolicitacaoVisitaDto } from './dto/create-solicitacao.dto';
import type { SaveRascunhoDto } from './dto/save-rascunho.dto';
import type { ListSolicitacoesVisitaDto } from './dto/list-solicitacoes.dto';
import type { AddAnexoDto } from './dto/add-anexo.dto';

const INCLUDE = {
  assistido: { select: { id: true, nome: true, cpf: true } },
  programa: { select: { id: true, nome: true, tipo: true } },
  motivoPrincipal: { select: { id: true, nome: true } },
  motivosSecundarios: { select: { id: true, nome: true } },
  prioridade: { select: { id: true, nome: true, nivel: true, cor: true } },
  anexos: {
    where: { deletedAt: null },
    select: { id: true, nome: true, mimeType: true, tamanho: true, url: true, createdAt: true },
  },
} satisfies Prisma.SolicitacaoVisitaInclude;

@Injectable()
export class SolicitacoesVisitaService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Leituras ----------

  async list(query: ListSolicitacoesVisitaDto): Promise<PaginatedResult<unknown>> {
    const { organizationId, externalUserId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.SolicitacaoVisitaWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assistidoId ? { assistidoId: query.assistidoId } : {}),
      ...(query.prioridadeId ? { prioridadeId: query.prioridadeId } : {}),
      ...(query.apenasMinhas ? { solicitanteExternalUserId: externalUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { descricaoDetalhada: { contains: query.search, mode: 'insensitive' } },
              { assistido: { nome: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.solicitacaoVisita.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitacaoVisita.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.solicitacaoVisita.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: INCLUDE,
    });
    if (!found) throw new NotFoundException('Solicitação não encontrada');
    return found;
  }

  // ---------- Mutações ----------

  /**
   * Cria a solicitação. Aceita rascunho parcial ou criação completa
   * — quem decide o status final é a rota chamadora (controller).
   */
  async create(dto: CreateSolicitacaoVisitaDto | SaveRascunhoDto, status: SolicitacaoVisitaStatus) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertReferencesInTenant(dto, organizationId);

    if (status !== 'RASCUNHO') {
      this.assertReadyForTriagem(dto);
    }

    try {
      return await this.prisma.solicitacaoVisita.create({
        data: {
          organizationId,
          status,
          enviadaTriagemEm: status === 'ENVIADA_TRIAGEM' ? new Date() : null,
          assistidoId: dto.assistidoId!,
          programaId: dto.programaId,
          motivoPrincipalId: dto.motivoPrincipalId,
          prioridadeId: dto.prioridadeId,
          descricaoDetalhada: dto.descricaoDetalhada ?? '',
          dataFatoGerador: dto.dataFatoGerador ? new Date(dto.dataFatoGerador) : new Date(),
          frequencia: dto.frequencia ?? 'UNICA',
          acoesJaRealizadas: dto.acoesJaRealizadas,
          riscoImediato: dto.riscoImediato ?? false,
          necessidadeAvaliacaoTecnica: dto.necessidadeAvaliacaoTecnica ?? false,
          sugestaoPerfilVisitador: dto.sugestaoPerfilVisitador,
          observacoes: dto.observacoes,
          solicitanteExternalUserId: externalUserId,
          createdByExternalUserId: externalUserId,
          updatedByExternalUserId: externalUserId,
          motivosSecundarios: dto.motivosSecundariosIds?.length
            ? { connect: dto.motivosSecundariosIds.map((id) => ({ id })) }
            : undefined,
        },
        include: INCLUDE,
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  /**
   * Atualiza enquanto está em rascunho. Outros estados são imutáveis
   * por este endpoint (transições futuras virão por endpoints
   * específicos da triagem).
   */
  async update(id: string, dto: SaveRascunhoDto) {
    const { organizationId, externalUserId } = requireTenant();
    const current = await this.loadEditable(id, organizationId);
    await this.assertReferencesInTenant(dto, organizationId);

    return this.prisma.solicitacaoVisita.update({
      where: { id: current.id },
      data: {
        ...(dto.assistidoId !== undefined ? { assistidoId: dto.assistidoId } : {}),
        ...(dto.programaId !== undefined ? { programaId: dto.programaId } : {}),
        ...(dto.motivoPrincipalId !== undefined
          ? { motivoPrincipalId: dto.motivoPrincipalId }
          : {}),
        ...(dto.prioridadeId !== undefined ? { prioridadeId: dto.prioridadeId } : {}),
        ...(dto.descricaoDetalhada !== undefined
          ? { descricaoDetalhada: dto.descricaoDetalhada }
          : {}),
        ...(dto.dataFatoGerador !== undefined
          ? { dataFatoGerador: new Date(dto.dataFatoGerador) }
          : {}),
        ...(dto.frequencia !== undefined ? { frequencia: dto.frequencia } : {}),
        ...(dto.acoesJaRealizadas !== undefined
          ? { acoesJaRealizadas: dto.acoesJaRealizadas }
          : {}),
        ...(dto.riscoImediato !== undefined ? { riscoImediato: dto.riscoImediato } : {}),
        ...(dto.necessidadeAvaliacaoTecnica !== undefined
          ? { necessidadeAvaliacaoTecnica: dto.necessidadeAvaliacaoTecnica }
          : {}),
        ...(dto.sugestaoPerfilVisitador !== undefined
          ? { sugestaoPerfilVisitador: dto.sugestaoPerfilVisitador }
          : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        ...(dto.motivosSecundariosIds !== undefined
          ? {
              motivosSecundarios: {
                set: dto.motivosSecundariosIds.map((id) => ({ id })),
              },
            }
          : {}),
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE,
    });
  }

  async enviarParaTriagem(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    const current = await this.loadEditable(id, organizationId);
    this.assertReadyForTriagem(current);

    return this.prisma.solicitacaoVisita.update({
      where: { id: current.id },
      data: {
        status: 'ENVIADA_TRIAGEM',
        enviadaTriagemEm: new Date(),
        updatedByExternalUserId: externalUserId,
      },
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    const { organizationId, externalUserId } = requireTenant();
    const current = await this.findOne(id);
    if (current.status !== 'RASCUNHO') {
      throw new ConflictException(
        'Apenas rascunhos podem ser removidos. Solicitações em andamento devem ser tratadas pela triagem.',
      );
    }
    return this.prisma.solicitacaoVisita.update({
      where: { id: current.id, organizationId },
      data: { deletedAt: new Date(), updatedByExternalUserId: externalUserId },
    });
  }

  // ---------- Anexos (metadata-only) ----------

  async addAnexo(solicitacaoId: string, dto: AddAnexoDto) {
    const { organizationId, externalUserId } = requireTenant();
    const current = await this.loadEditable(solicitacaoId, organizationId);
    return this.prisma.solicitacaoVisitaAnexo.create({
      data: {
        organizationId,
        solicitacaoId: current.id,
        nome: dto.nome,
        mimeType: dto.mimeType,
        tamanho: dto.tamanho,
        url: dto.url,
        createdByExternalUserId: externalUserId,
      },
    });
  }

  async removeAnexo(solicitacaoId: string, anexoId: string) {
    const { organizationId } = requireTenant();
    await this.loadEditable(solicitacaoId, organizationId);
    const found = await this.prisma.solicitacaoVisitaAnexo.findFirst({
      where: {
        id: anexoId,
        organizationId,
        solicitacaoId,
        deletedAt: null,
      },
    });
    if (!found) throw new NotFoundException('Anexo não encontrado');
    return this.prisma.solicitacaoVisitaAnexo.update({
      where: { id: anexoId },
      data: { deletedAt: new Date() },
    });
  }

  // ---------- Helpers ----------

  private async loadEditable(id: string, organizationId: string) {
    const found = await this.prisma.solicitacaoVisita.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Solicitação não encontrada');
    if (found.status !== 'RASCUNHO') {
      throw new ConflictException(
        `Solicitação está com status "${found.status}" e não pode mais ser editada por este endpoint.`,
      );
    }
    return found;
  }

  /**
   * Garante que TODAS as FKs informadas pertencem ao mesmo tenant.
   * Sem isso, um payload malicioso poderia referenciar IDs de outra OSC.
   */
  private async assertReferencesInTenant(
    dto: Partial<CreateSolicitacaoVisitaDto>,
    organizationId: string,
  ): Promise<void> {
    const checks: Promise<void>[] = [];

    if (dto.assistidoId) {
      checks.push(
        this.prisma.assistido
          .count({ where: { id: dto.assistidoId, organizationId, deletedAt: null } })
          .then((n) => {
            if (!n) throw new BadRequestException('Assistido inválido para este tenant');
          }),
      );
    }
    if (dto.programaId) {
      checks.push(
        this.prisma.programa
          .count({ where: { id: dto.programaId, organizationId, deletedAt: null } })
          .then((n) => {
            if (!n) throw new BadRequestException('Programa inválido para este tenant');
          }),
      );
    }
    if (dto.motivoPrincipalId) {
      checks.push(
        this.prisma.motivoVisita
          .count({ where: { id: dto.motivoPrincipalId, organizationId, deletedAt: null } })
          .then((n) => {
            if (!n) throw new BadRequestException('Motivo principal inválido para este tenant');
          }),
      );
    }
    if (dto.prioridadeId) {
      checks.push(
        this.prisma.prioridade
          .count({ where: { id: dto.prioridadeId, organizationId, deletedAt: null } })
          .then((n) => {
            if (!n) throw new BadRequestException('Prioridade inválida para este tenant');
          }),
      );
    }
    if (dto.motivosSecundariosIds?.length) {
      checks.push(
        this.prisma.motivoVisita
          .count({
            where: {
              id: { in: dto.motivosSecundariosIds },
              organizationId,
              deletedAt: null,
            },
          })
          .then((n) => {
            if (n !== dto.motivosSecundariosIds!.length) {
              throw new BadRequestException(
                'Um ou mais motivos secundários são inválidos para este tenant',
              );
            }
          }),
      );
    }

    await Promise.all(checks);
  }

  private assertReadyForTriagem(s: Partial<CreateSolicitacaoVisitaDto>): void {
    const missing: string[] = [];
    if (!s.assistidoId) missing.push('assistido');
    if (!s.descricaoDetalhada || s.descricaoDetalhada.trim().length < 20) {
      missing.push('descricaoDetalhada (mínimo 20 caracteres)');
    }
    if (!s.dataFatoGerador) missing.push('dataFatoGerador');
    if (!s.frequencia) missing.push('frequencia');
    if (!s.motivoPrincipalId) missing.push('motivoPrincipalId');
    if (missing.length > 0) {
      throw new BadRequestException(
        `Campos obrigatórios para triagem ausentes: ${missing.join(', ')}`,
      );
    }
  }
}

function mapPrismaError(e: unknown): Error {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
    return new BadRequestException('Referência inválida (FK)');
  }
  return e as Error;
}
