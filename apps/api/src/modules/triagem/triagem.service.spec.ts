import { ConflictException, NotFoundException } from '@nestjs/common';
import { TriagemService } from './triagem.service';
import { tenantStorage } from '../../common/tenant/tenant.context';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../../common/audit/audit.service';

const TENANT_A = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  externalUserId: 'a-user-1',
};
const TENANT_B = {
  organizationId: '22222222-2222-2222-2222-222222222222',
  externalUserId: 'b-user-1',
};

interface SolicitacaoMock {
  id: string;
  organizationId: string;
  status: string;
  triadorExternalUserId: string | null;
}

function makePrismaMock(state: { sols: SolicitacaoMock[] }) {
  return {
    solicitacaoVisita: {
      findFirst: jest.fn(({ where }: { where: { id: string; organizationId: string } }) => {
        const found = state.sols.find(
          (s) =>
            s.id === where.id &&
            s.organizationId === where.organizationId,
        );
        return Promise.resolve(found ?? null);
      }),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const sol = state.sols.find((s) => s.id === where.id);
        if (sol) Object.assign(sol, data);
        return Promise.resolve(sol);
      }),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    triagem: {
      create: jest.fn().mockResolvedValue({ id: 'tri-novo' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    prioridade: { count: jest.fn().mockResolvedValue(1) },
    tipoEncaminhamento: { count: jest.fn().mockResolvedValue(1) },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        // É um callback — executa normalmente
        return (arg as (tx: unknown) => unknown)(this);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
}

function withTenant<T>(
  ctx: { organizationId: string; externalUserId: string },
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run(ctx, fn);
}

describe('TriagemService — máquina de estado e isolamento', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let audit: { record: jest.Mock };
  let service: TriagemService;
  let state: { sols: SolicitacaoMock[] };

  beforeEach(() => {
    state = {
      sols: [
        {
          id: 'sol-A1',
          organizationId: TENANT_A.organizationId,
          status: 'ENVIADA_TRIAGEM',
          triadorExternalUserId: null,
        },
        {
          id: 'sol-A2',
          organizationId: TENANT_A.organizationId,
          status: 'EM_TRIAGEM',
          triadorExternalUserId: TENANT_A.externalUserId,
        },
        {
          id: 'sol-A3',
          organizationId: TENANT_A.organizationId,
          status: 'APROVADA',
          triadorExternalUserId: TENANT_A.externalUserId,
        },
        {
          id: 'sol-B1',
          organizationId: TENANT_B.organizationId,
          status: 'ENVIADA_TRIAGEM',
          triadorExternalUserId: null,
        },
      ],
    };
    prisma = makePrismaMock(state);
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TriagemService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  it('assumir transita ENVIADA_TRIAGEM → EM_TRIAGEM no mesmo tenant', async () => {
    await withTenant(TENANT_A, () => service.assumir('sol-A1'));
    const sol = state.sols.find((s) => s.id === 'sol-A1')!;
    expect(sol.status).toBe('EM_TRIAGEM');
    expect(sol.triadorExternalUserId).toBe(TENANT_A.externalUserId);
  });

  it('assumir solicitação de OUTRO tenant retorna 404', async () => {
    await expect(
      // sol-A1 pertence ao tenant A, mas chamamos com JWT do tenant B
      withTenant(TENANT_B, () => service.assumir('sol-A1')),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Estado intacto
    expect(state.sols.find((s) => s.id === 'sol-A1')!.status).toBe(
      'ENVIADA_TRIAGEM',
    );
  });

  it('assumir solicitação que não está em ENVIADA_TRIAGEM falha com 409', async () => {
    await expect(
      withTenant(TENANT_A, () => service.assumir('sol-A3')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('decidir só funciona com solicitação EM_TRIAGEM e pelo triador que assumiu', async () => {
    await expect(
      withTenant(
        { ...TENANT_A, externalUserId: 'outro-user-A' },
        () =>
          service.decidir('sol-A2', {
            complexidade: 'MEDIA',
            justificativaTecnica: 'mínimo dez chars',
            decisao: 'APROVAR_VISITA',
          }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    // Mesmo triador que assumiu → ok
    await withTenant(TENANT_A, () =>
      service.decidir('sol-A2', {
        complexidade: 'MEDIA',
        justificativaTecnica: 'justificativa válida 10+',
        decisao: 'APROVAR_VISITA',
      }),
    );
    expect(state.sols.find((s) => s.id === 'sol-A2')!.status).toBe('APROVADA');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'triagem.decidir' }),
    );
  });

  it('decisão DEVOLVER_COMPLEMENTACAO volta para RASCUNHO e libera triador', async () => {
    await withTenant(TENANT_A, () =>
      service.decidir('sol-A2', {
        complexidade: 'BAIXA',
        justificativaTecnica: 'falta info A e B 10+',
        decisao: 'DEVOLVER_COMPLEMENTACAO',
      }),
    );
    const sol = state.sols.find((s) => s.id === 'sol-A2')!;
    expect(sol.status).toBe('RASCUNHO');
    expect(sol.triadorExternalUserId).toBeNull();
  });
});
