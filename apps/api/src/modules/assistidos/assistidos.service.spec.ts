import { NotFoundException } from '@nestjs/common';
import { AssistidosService } from './assistidos.service';
import { tenantStorage } from '../../common/tenant/tenant.context';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../../common/audit/audit.service';

const TENANT_A = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  externalUserId: 'a1aaaaaa-1111-1111-1111-111111111111',
};
const TENANT_B = {
  organizationId: '22222222-2222-2222-2222-222222222222',
  externalUserId: 'b1bbbbbb-2222-2222-2222-222222222222',
};

interface PrismaMock {
  assistido: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
}

function makePrismaMock(): PrismaMock {
  return {
    assistido: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
}

function makeAuditMock(): { record: jest.Mock } {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

function withTenant<T>(
  ctx: { organizationId: string; externalUserId: string },
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run(ctx, fn);
}

describe('AssistidosService — isolamento multi-tenant + auditoria', () => {
  let prisma: PrismaMock;
  let audit: { record: jest.Mock };
  let service: AssistidosService;

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    service = new AssistidosService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  it('list aplica organizationId do JWT em TODA query', async () => {
    prisma.assistido.findMany.mockResolvedValue([]);
    prisma.assistido.count.mockResolvedValue(0);

    await withTenant(TENANT_A, () => service.list({}));

    const findCall = prisma.assistido.findMany.mock.calls[0][0];
    const countCall = prisma.assistido.count.mock.calls[0][0];
    expect(findCall.where.organizationId).toBe(TENANT_A.organizationId);
    expect(countCall.where.organizationId).toBe(TENANT_A.organizationId);
    expect(findCall.where.deletedAt).toBeNull();
  });

  it('findOne com tenant diferente do registro retorna 404', async () => {
    // Simula que o registro só existe no tenant A.
    prisma.assistido.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(
        where.organizationId === TENANT_A.organizationId
          ? { id: 'asst-1', nome: 'Maria' }
          : null,
      ),
    );

    // Tenta acessar como tenant B → 404
    await expect(
      withTenant(TENANT_B, () => service.findOne('asst-1')),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Como tenant A → ok
    const found = await withTenant(TENANT_A, () => service.findOne('asst-1'));
    expect(found).toMatchObject({ id: 'asst-1' });
  });

  it('create grava createdByExternalUserId do JWT, NUNCA do payload', async () => {
    const created = { id: 'asst-new', nome: 'Ana' };
    prisma.assistido.create.mockResolvedValue(created);

    await withTenant(TENANT_A, () =>
      service.create({
        nome: 'Ana',
        // Mesmo se o cliente tentasse forjar (não está no DTO, mas reforça que o backend ignora):
        // @ts-expect-error — não existe no DTO, está aqui só para garantir que é ignorado
        createdByExternalUserId: 'forjado-por-cliente',
      }),
    );

    const args = prisma.assistido.create.mock.calls[0][0];
    expect(args.data.organizationId).toBe(TENANT_A.organizationId);
    expect(args.data.createdByExternalUserId).toBe(TENANT_A.externalUserId);
    expect(args.data.createdByExternalUserId).not.toBe('forjado-por-cliente');
  });

  it('create dispara audit.record com after preenchido', async () => {
    const created = { id: 'asst-new', nome: 'Ana', organizationId: TENANT_A.organizationId };
    prisma.assistido.create.mockResolvedValue(created);

    await withTenant(TENANT_A, () => service.create({ nome: 'Ana' }));

    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        entity: 'Assistido',
        entityId: 'asst-new',
        after: created,
      }),
    );
  });

  it('update carrega before do banco e grava before/after no audit', async () => {
    const before = {
      id: 'asst-1',
      nome: 'Antigo',
      telefone: '(41) 0000-0000',
      organizationId: TENANT_A.organizationId,
    };
    const after = { ...before, telefone: '(41) 9999-9999' };
    prisma.assistido.findFirst.mockResolvedValue(before);
    prisma.assistido.update.mockResolvedValue(after);

    await withTenant(TENANT_A, () =>
      service.update('asst-1', { telefone: '(41) 9999-9999' }),
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        before,
        after,
        entity: 'Assistido',
        entityId: 'asst-1',
      }),
    );
  });

  it('update em registro de outro tenant retorna 404 (sem tocar update)', async () => {
    prisma.assistido.findFirst.mockResolvedValue(null);

    await expect(
      withTenant(TENANT_B, () =>
        service.update('asst-do-tenant-A', { telefone: 'X' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.assistido.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('remove faz soft-delete e grava audit', async () => {
    const before = { id: 'asst-1', nome: 'Maria', deletedAt: null };
    const deleted = { ...before, deletedAt: new Date() };
    prisma.assistido.findFirst.mockResolvedValue(before);
    prisma.assistido.update.mockResolvedValue(deleted);

    await withTenant(TENANT_A, () => service.remove('asst-1'));

    const updateArgs = prisma.assistido.update.mock.calls[0][0];
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'delete' }),
    );
  });
});
