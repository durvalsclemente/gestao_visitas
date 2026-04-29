import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import {
  paginate,
  type PaginatedResult,
} from '../../common/pagination/pagination.dto';
import type { CentralUser } from '../../common/auth/central-user.types';
import {
  ALLOWED_MIME_TYPES,
  DOCUMENTO_MAX_SIZE,
  type CreateDocumentoDto,
  type ListDocumentosDto,
  type UpdateDocumentoDto,
} from './dto/documento.dto';

type ParentField =
  | 'assistidoId'
  | 'solicitacaoId'
  | 'visitaId'
  | 'relatorioId'
  | 'planoAcaoId';

const PARENT_FIELDS: ParentField[] = [
  'assistidoId',
  'solicitacaoId',
  'visitaId',
  'relatorioId',
  'planoAcaoId',
];

@Injectable()
export class DocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Listagem ----------

  async list(
    query: ListDocumentosDto,
    user: CentralUser,
  ): Promise<PaginatedResult<unknown>> {
    const { organizationId } = requireTenant();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.DocumentoWhereInput = {
      organizationId,
      deletedAt: null,
      ...this.accessibleWhere(user),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.sigilo ? { sigilo: query.sigilo } : {}),
      ...(query.assistidoId ? { assistidoId: query.assistidoId } : {}),
      ...(query.solicitacaoId ? { solicitacaoId: query.solicitacaoId } : {}),
      ...(query.visitaId ? { visitaId: query.visitaId } : {}),
      ...(query.relatorioId ? { relatorioId: query.relatorioId } : {}),
      ...(query.planoAcaoId ? { planoAcaoId: query.planoAcaoId } : {}),
      ...(query.apenasMeus
        ? { uploadedByExternalUserId: user.externalUserId }
        : {}),
      ...(query.search
        ? {
            OR: [
              { nome: { contains: query.search, mode: 'insensitive' } },
              { fileName: { contains: query.search, mode: 'insensitive' } },
              { descricao: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documento.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.documento.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string, user: CentralUser) {
    const { organizationId } = requireTenant();
    const found = await this.prisma.documento.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Documento não encontrado');
    if (!this.canAccess(found, user)) {
      throw new ForbiddenException('Documento sigiloso — acesso restrito');
    }
    return found;
  }

  // ---------- Criação ----------

  async create(dto: CreateDocumentoDto) {
    const { organizationId, externalUserId } = requireTenant();

    this.assertMimeType(dto.mimeType);
    this.assertSize(dto.tamanho);

    const parent = this.resolveParent(dto);
    await this.assertParentInTenant(parent, organizationId);

    return this.prisma.documento.create({
      data: {
        organizationId,
        nome: dto.nome,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        tamanho: dto.tamanho,
        url: dto.url,
        hash: dto.hash,
        tipo: dto.tipo ?? 'OUTRO',
        sigilo: dto.sigilo ?? 'RESTRITO',
        descricao: dto.descricao,
        [parent.field]: parent.id,
        uploadedByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  // ---------- Atualização (metadata) ----------

  async update(id: string, dto: UpdateDocumentoDto, user: CentralUser) {
    const { organizationId, externalUserId } = requireTenant();
    const current = await this.prisma.documento.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!current) throw new NotFoundException('Documento não encontrado');
    if (!this.canModify(current, user)) {
      throw new ForbiddenException('Sem permissão para alterar este documento');
    }
    if (dto.mimeType) this.assertMimeType(dto.mimeType);
    if (dto.tamanho !== undefined) this.assertSize(dto.tamanho);

    return this.prisma.documento.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.fileName !== undefined ? { fileName: dto.fileName } : {}),
        ...(dto.mimeType !== undefined ? { mimeType: dto.mimeType } : {}),
        ...(dto.tamanho !== undefined ? { tamanho: dto.tamanho } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.hash !== undefined ? { hash: dto.hash } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.sigilo !== undefined ? { sigilo: dto.sigilo } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  async remove(id: string, user: CentralUser) {
    const { organizationId, externalUserId } = requireTenant();
    const current = await this.prisma.documento.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!current) throw new NotFoundException('Documento não encontrado');
    if (!this.canModify(current, user)) {
      throw new ForbiddenException('Sem permissão para excluir este documento');
    }
    return this.prisma.documento.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  // ---------- Helpers de validação ----------

  private assertMimeType(mime: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mime.toLowerCase())) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${mime}. Aceitos: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private assertSize(bytes: number): void {
    if (bytes <= 0) {
      throw new BadRequestException('Tamanho do arquivo inválido');
    }
    if (bytes > DOCUMENTO_MAX_SIZE) {
      throw new BadRequestException(
        `Arquivo excede o limite de ${(DOCUMENTO_MAX_SIZE / 1024 / 1024).toFixed(0)} MB`,
      );
    }
  }

  /** Garante que EXATAMENTE UM vínculo foi informado. */
  private resolveParent(dto: CreateDocumentoDto): { field: ParentField; id: string } {
    const filled = PARENT_FIELDS.filter((f) => !!dto[f]).map(
      (f) => [f, dto[f] as string] as const,
    );
    if (filled.length === 0) {
      throw new BadRequestException(
        'Informe um vínculo: assistido, solicitação, visita, relatório ou plano',
      );
    }
    if (filled.length > 1) {
      throw new BadRequestException(
        'Documento pode estar vinculado a apenas uma entidade',
      );
    }
    const [field, id] = filled[0];
    return { field, id };
  }

  /** Verifica que a entidade pai pertence ao tenant do JWT. */
  private async assertParentInTenant(
    parent: { field: ParentField; id: string },
    organizationId: string,
  ): Promise<void> {
    let count: number;
    switch (parent.field) {
      case 'assistidoId':
        count = await this.prisma.assistido.count({
          where: { id: parent.id, organizationId, deletedAt: null },
        });
        break;
      case 'solicitacaoId':
        count = await this.prisma.solicitacaoVisita.count({
          where: { id: parent.id, organizationId, deletedAt: null },
        });
        break;
      case 'visitaId':
        count = await this.prisma.visita.count({
          where: { id: parent.id, organizationId, deletedAt: null },
        });
        break;
      case 'relatorioId':
        count = await this.prisma.relatorioVisita.count({
          where: { id: parent.id, organizationId },
        });
        break;
      case 'planoAcaoId':
        count = await this.prisma.planoAcao.count({
          where: { id: parent.id, organizationId, deletedAt: null },
        });
        break;
    }
    if (!count) {
      throw new BadRequestException(
        `Entidade vinculada (${parent.field}) inválida para este tenant`,
      );
    }
  }

  // ---------- Sigilo / acesso ----------

  /**
   * Cláusula WHERE Prisma que limita a leitura conforme nível de
   * sigilo do documento × role do usuário. Aplicada em listagens.
   */
  private accessibleWhere(user: CentralUser): Prisma.DocumentoWhereInput {
    if (user.centralRole === 'SUPER_ADMIN') return {};
    if (user.centralRole === 'ORG_ADMIN') {
      return {
        OR: [
          { sigilo: { in: ['PUBLICO', 'RESTRITO'] } },
          { uploadedByExternalUserId: user.externalUserId },
        ],
      };
    }
    // ORG_USER (e qualquer role não privilegiada).
    return {
      OR: [
        { sigilo: 'PUBLICO' },
        { uploadedByExternalUserId: user.externalUserId },
      ],
    };
  }

  /** Mesma lógica do filtro, aplicada a um documento já carregado. */
  private canAccess(
    doc: { sigilo: string; uploadedByExternalUserId: string },
    user: CentralUser,
  ): boolean {
    if (user.centralRole === 'SUPER_ADMIN') return true;
    if (doc.uploadedByExternalUserId === user.externalUserId) return true;
    if (doc.sigilo === 'PUBLICO') return true;
    if (doc.sigilo === 'RESTRITO' && user.centralRole === 'ORG_ADMIN') return true;
    return false;
  }

  /** Modificar/excluir: uploader, ORG_ADMIN ou SUPER_ADMIN. */
  private canModify(
    doc: { uploadedByExternalUserId: string },
    user: CentralUser,
  ): boolean {
    if (user.centralRole === 'SUPER_ADMIN' || user.centralRole === 'ORG_ADMIN') {
      return true;
    }
    return doc.uploadedByExternalUserId === user.externalUserId;
  }
}
