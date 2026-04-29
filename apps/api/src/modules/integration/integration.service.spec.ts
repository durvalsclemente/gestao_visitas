import { Prisma } from '@prisma/client';
import { IntegrationService } from './integration.service';
import type { ProvisionWebhookDto } from './dto/provision.dto';
import type { DeprovisionWebhookDto } from './dto/deprovision.dto';
import type { UserSyncWebhookDto } from './dto/user-sync.dto';

interface FakeTx {
  webhookDelivery: { create: jest.Mock };
  organizationTenant: { upsert: jest.Mock; updateMany: jest.Mock };
  userRef: { upsert: jest.Mock };
}

function makePrismaMock(opts: { duplicateOnNthCall?: number } = {}) {
  let txCallCount = 0;
  const tx: FakeTx = {
    webhookDelivery: { create: jest.fn() },
    organizationTenant: { upsert: jest.fn(), updateMany: jest.fn() },
    userRef: { upsert: jest.fn() },
  };

  const $transaction = jest.fn(async (fn: (t: FakeTx) => Promise<void>) => {
    txCallCount += 1;
    if (opts.duplicateOnNthCall === txCallCount) {
      throw new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
    }
    return fn(tx);
  });

  return {
    tx,
    prisma: {
      $transaction,
      webhookDelivery: { create: jest.fn() },
    } as unknown as ConstructorParameters<typeof IntegrationService>[0],
  };
}

const payload: ProvisionWebhookDto = {
  event: 'LICENSE_PROVISIONED',
  licenseId: 'lic-1',
  organizationId: '00000000-0000-0000-0000-000000000001',
  orgName: 'OSC Teste',
  cnpj: '12.345.678/0001-99',
  appSlug: 'gestao-visitas',
};

describe('IntegrationService.provision (idempotência)', () => {
  it('aplica na primeira chamada', async () => {
    const { prisma, tx } = makePrismaMock();
    const svc = new IntegrationService(prisma);

    const r = await svc.provision(payload);

    expect(r).toEqual({ status: 'applied', organizationId: payload.organizationId });
    expect(tx.organizationTenant.upsert).toHaveBeenCalledTimes(1);
    expect(tx.webhookDelivery.create).toHaveBeenCalledTimes(1);
  });

  it('reportar ignored_duplicate quando o mesmo payload chega de novo', async () => {
    const { prisma } = makePrismaMock({ duplicateOnNthCall: 1 });
    const svc = new IntegrationService(prisma);

    const r = await svc.provision(payload);

    expect(r).toEqual({ status: 'ignored_duplicate', organizationId: payload.organizationId });
  });

  it('hash do payload é estável: mesma intenção em ordem diferente conta como duplicata', async () => {
    // Com chaves reordenadas, o stableStringify deve produzir o
    // mesmo hash → 2ª chamada cai como ignored_duplicate.
    const reordered: ProvisionWebhookDto = {
      organizationId: payload.organizationId,
      event: 'LICENSE_PROVISIONED',
      orgName: payload.orgName,
      cnpj: payload.cnpj,
      licenseId: payload.licenseId,
      appSlug: payload.appSlug,
    };
    const { prisma } = makePrismaMock({ duplicateOnNthCall: 2 });
    const svc = new IntegrationService(prisma);

    const r1 = await svc.provision(payload);
    const r2 = await svc.provision(reordered);

    expect(r1.status).toBe('applied');
    expect(r2.status).toBe('ignored_duplicate');
  });
});

describe('IntegrationService.deprovision', () => {
  it('marca tenant como inativo (soft-disable, não apaga)', async () => {
    const { prisma, tx } = makePrismaMock();
    const svc = new IntegrationService(prisma);

    const dto: DeprovisionWebhookDto = {
      event: 'LICENSE_DEPROVISIONED',
      licenseId: 'lic-1',
      organizationId: '00000000-0000-0000-0000-000000000001',
    };
    const r = await svc.deprovision(dto);

    expect(r.status).toBe('applied');
    expect(tx.organizationTenant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: dto.organizationId,
          active: true,
        }),
        data: expect.objectContaining({ active: false }),
      }),
    );
  });
});

describe('IntegrationService.userSync', () => {
  it('upsert por (organizationId, externalUserId), garante tenant existe', async () => {
    const { prisma, tx } = makePrismaMock();
    const svc = new IntegrationService(prisma);

    const dto: UserSyncWebhookDto = {
      event: 'USER_SYNCED',
      licenseId: 'lic-1',
      organizationId: '00000000-0000-0000-0000-000000000001',
      users: [
        { id: 'u1', email: 'a@x.com', name: 'Ana', role: 'ORG_ADMIN' },
        { id: 'u2', email: 'b@x.com', name: 'Bia', role: 'ORG_USER' },
      ],
    };

    const r = await svc.userSync(dto);

    expect(r.status).toBe('applied');
    // tenant é upserted (caso ainda não exista)
    expect(tx.organizationTenant.upsert).toHaveBeenCalledTimes(1);
    // dois usuários sincronizados
    expect(tx.userRef.upsert).toHaveBeenCalledTimes(2);

    const firstCall = tx.userRef.upsert.mock.calls[0][0];
    expect(firstCall.where.organizationId_externalUserId).toEqual({
      organizationId: dto.organizationId,
      externalUserId: 'u1',
    });
    expect(firstCall.create.lastKnownCentralRole).toBe('ORG_ADMIN');
  });
});
