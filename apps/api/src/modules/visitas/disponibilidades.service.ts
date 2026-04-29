import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenant } from '../../common/tenant/require-tenant';
import type {
  CreateDisponibilidadeDto,
  UpdateDisponibilidadeDto,
} from './dto/disponibilidade.dto';

/**
 * Disponibilidade semanal (recorrente) de cada visitador.
 * Modelo simplificado: SEG..DOM × intervalo HH:mm-HH:mm.
 */
@Injectable()
export class DisponibilidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(visitadorId: string) {
    const { organizationId } = requireTenant();
    await this.assertVisitadorExists(visitadorId, organizationId);

    return this.prisma.visitadorDisponibilidade.findMany({
      where: { organizationId, visitadorId, deletedAt: null },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async create(visitadorId: string, dto: CreateDisponibilidadeDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertVisitadorExists(visitadorId, organizationId);
    this.assertHorasValidas(dto.horaInicio, dto.horaFim);

    return this.prisma.visitadorDisponibilidade.create({
      data: {
        organizationId,
        visitadorId,
        diaSemana: dto.diaSemana,
        horaInicio: dto.horaInicio,
        horaFim: dto.horaFim,
        ativo: dto.ativo ?? true,
        createdByExternalUserId: externalUserId,
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  async update(visitadorId: string, id: string, dto: UpdateDisponibilidadeDto) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId, visitadorId);
    if (dto.horaInicio && dto.horaFim) {
      this.assertHorasValidas(dto.horaInicio, dto.horaFim);
    }
    return this.prisma.visitadorDisponibilidade.update({
      where: { id },
      data: {
        ...dto,
        updatedByExternalUserId: externalUserId,
      },
    });
  }

  async remove(visitadorId: string, id: string) {
    const { organizationId, externalUserId } = requireTenant();
    await this.assertExists(id, organizationId, visitadorId);
    return this.prisma.visitadorDisponibilidade.update({
      where: { id },
      data: { deletedAt: new Date(), updatedByExternalUserId: externalUserId },
    });
  }

  // ---------- Helpers ----------

  private async assertVisitadorExists(visitadorId: string, organizationId: string) {
    const exists = await this.prisma.visitador.count({
      where: { id: visitadorId, organizationId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Visitador não encontrado');
  }

  private async assertExists(id: string, organizationId: string, visitadorId: string) {
    const exists = await this.prisma.visitadorDisponibilidade.count({
      where: { id, organizationId, visitadorId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Disponibilidade não encontrada');
  }

  private assertHorasValidas(inicio: string, fim: string): void {
    if (inicio >= fim) {
      throw new BadRequestException('horaFim deve ser maior que horaInicio');
    }
  }
}
