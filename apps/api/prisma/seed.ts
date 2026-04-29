/**
 * Seed de demonstração — Gestão de Visitas
 *
 * Cria dois "tenants simulados" (que existiriam após dois
 * `LICENSE_PROVISIONED` da Central de Acessos) e popula o domínio
 * para permitir demos e testes manuais.
 *
 * IMPORTANTE (CLAUDE.md §2):
 *   - Não criamos User, Organization, Session, Role, Permission.
 *   - `OrganizationTenant` e `UserRef` são REFERÊNCIAS aos UUIDs
 *     que viriam da Central; aqui apenas inventamos os UUIDs para
 *     habilitar o ambiente de desenvolvimento.
 *
 * Idempotente: re-rodar não duplica registros (usa upsert e IDs
 * determinísticos).
 *
 * Execução:
 *   pnpm --filter @gestao-visitas/api run prisma:seed
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ----- IDs determinísticos (facilita re-runs e testes manuais) -----

const TENANT_NORTE = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  orgName: 'OSC Demo Norte',
  cnpj: '11.111.111/0001-11',
  appSlug: 'gestao-visitas',
  licenseId: 'lic-demo-norte',
};

const TENANT_SUL = {
  organizationId: '22222222-2222-2222-2222-222222222222',
  orgName: 'OSC Demo Sul',
  cnpj: '22.222.222/0001-22',
  appSlug: 'gestao-visitas',
  licenseId: 'lic-demo-sul',
};

interface SimUser {
  externalUserId: string;
  email: string;
  name: string;
  role: 'ORG_ADMIN' | 'ORG_USER';
}

const USERS_NORTE: SimUser[] = [
  { externalUserId: 'a1aaaaaa-1111-1111-1111-111111111111', email: 'ana@demo-norte.org', name: 'Ana Coordenadora', role: 'ORG_ADMIN' },
  { externalUserId: 'a2aaaaaa-1111-1111-1111-111111111111', email: 'bruno@demo-norte.org', name: 'Bruno Educador', role: 'ORG_USER' },
  { externalUserId: 'a3aaaaaa-1111-1111-1111-111111111111', email: 'carla@demo-norte.org', name: 'Carla Visitadora', role: 'ORG_USER' },
];

const USERS_SUL: SimUser[] = [
  { externalUserId: 'b1bbbbbb-2222-2222-2222-222222222222', email: 'diego@demo-sul.org', name: 'Diego Coordenador', role: 'ORG_ADMIN' },
  { externalUserId: 'b2bbbbbb-2222-2222-2222-222222222222', email: 'eva@demo-sul.org', name: 'Eva Educadora', role: 'ORG_USER' },
];

// ===== Helpers =====

function logSection(title: string) {
  console.log(`\n──── ${title} ────`);
}

function org(orgId: string, suffix: string): string {
  // Constrói UUIDs determinísticos por tenant + sufixo curto.
  return `${orgId.slice(0, 24)}${suffix.padStart(12, '0')}`;
}

// ===== Seed por tenant =====

async function seedTenant(
  tenant: typeof TENANT_NORTE,
  users: SimUser[],
) {
  const orgId = tenant.organizationId;
  const adminUser = users[0];

  // 1) OrganizationTenant
  await prisma.organizationTenant.upsert({
    where: { organizationId: orgId },
    update: {
      orgName: tenant.orgName,
      cnpj: tenant.cnpj,
      appSlug: tenant.appSlug,
      licenseId: tenant.licenseId,
      active: true,
      disabledAt: null,
    },
    create: {
      organizationId: orgId,
      orgName: tenant.orgName,
      cnpj: tenant.cnpj,
      appSlug: tenant.appSlug,
      licenseId: tenant.licenseId,
      active: true,
    },
  });
  console.log(`tenant ${tenant.orgName} ✓`);

  // 2) UserRefs
  for (const u of users) {
    await prisma.userRef.upsert({
      where: {
        organizationId_externalUserId: {
          organizationId: orgId,
          externalUserId: u.externalUserId,
        },
      },
      update: {
        email: u.email,
        name: u.name,
        lastKnownCentralRole: u.role,
      },
      create: {
        organizationId: orgId,
        externalUserId: u.externalUserId,
        email: u.email,
        name: u.name,
        lastKnownCentralRole: u.role,
      },
    });
  }
  console.log(`user_refs ${users.length} ✓`);

  // 3) Lookups (motivos, prioridades, encaminhamentos, status, programas)
  const motivos = [
    { id: org(orgId, 'mot1'), codigo: 'ACMP', nome: 'Acompanhamento mensal', ordem: 1 },
    { id: org(orgId, 'mot2'), codigo: 'EMERG', nome: 'Emergencial', ordem: 2, cor: '#D14343' },
    { id: org(orgId, 'mot3'), codigo: 'INI', nome: 'Inicial', ordem: 3 },
    { id: org(orgId, 'mot4'), codigo: 'EVAS', nome: 'Risco de evasão', ordem: 4, cor: '#F0A500' },
  ];
  for (const m of motivos) {
    await prisma.motivoVisita.upsert({
      where: { organizationId_codigo: { organizationId: orgId, codigo: m.codigo } },
      update: { ...m, organizationId: orgId },
      create: { ...m, organizationId: orgId, createdByExternalUserId: adminUser.externalUserId, updatedByExternalUserId: adminUser.externalUserId },
    });
  }

  const prioridades = [
    { id: org(orgId, 'pri1'), codigo: 'BAIXA', nome: 'Baixa', nivel: 1, cor: '#94A3B8' },
    { id: org(orgId, 'pri2'), codigo: 'MEDIA', nome: 'Média', nivel: 2, cor: '#F0A500' },
    { id: org(orgId, 'pri3'), codigo: 'ALTA', nome: 'Alta', nivel: 3, cor: '#D14343' },
    { id: org(orgId, 'pri4'), codigo: 'CRIT', nome: 'Crítica', nivel: 4, cor: '#7A1F1F' },
  ];
  for (const p of prioridades) {
    await prisma.prioridade.upsert({
      where: { organizationId_codigo: { organizationId: orgId, codigo: p.codigo } },
      update: { ...p, organizationId: orgId },
      create: { ...p, organizationId: orgId, createdByExternalUserId: adminUser.externalUserId, updatedByExternalUserId: adminUser.externalUserId },
    });
  }

  const encaminhamentos = [
    { id: org(orgId, 'enc1'), codigo: 'CRAS', nome: 'CRAS', ordem: 1 },
    { id: org(orgId, 'enc2'), codigo: 'SAUDE', nome: 'Unidade de Saúde', ordem: 2 },
    { id: org(orgId, 'enc3'), codigo: 'JURID', nome: 'Defensoria pública', ordem: 3 },
  ];
  for (const t of encaminhamentos) {
    await prisma.tipoEncaminhamento.upsert({
      where: { organizationId_codigo: { organizationId: orgId, codigo: t.codigo } },
      update: { ...t, organizationId: orgId },
      create: { ...t, organizationId: orgId, createdByExternalUserId: adminUser.externalUserId, updatedByExternalUserId: adminUser.externalUserId },
    });
  }

  const programas = [
    { id: org(orgId, 'prog1'), codigo: 'CINF', nome: 'Curso de Informática', tipo: 'CURSO' as const, cargaHoraria: 40 },
    { id: org(orgId, 'prog2'), codigo: 'AREF', nome: 'Acompanhamento Escolar', tipo: 'ATIVIDADE' as const },
    { id: org(orgId, 'prog3'), codigo: 'PJUV', nome: 'Projeto Juventude', tipo: 'PROJETO' as const },
  ];
  for (const p of programas) {
    await prisma.programa.upsert({
      where: { organizationId_codigo: { organizationId: orgId, codigo: p.codigo } },
      update: { ...p, organizationId: orgId },
      create: { ...p, organizationId: orgId, createdByExternalUserId: adminUser.externalUserId, updatedByExternalUserId: adminUser.externalUserId },
    });
  }

  console.log(`lookups ✓`);

  // 4) Assistidos
  const assistidos = [
    {
      id: org(orgId, 'asst1'),
      nome: `${tenant.orgName} — Família Silva`,
      cpf: orgId === TENANT_NORTE.organizationId ? '111.111.111-11' : '222.222.222-22',
      cidade: 'Curitiba',
      uf: 'PR',
    },
    {
      id: org(orgId, 'asst2'),
      nome: `${tenant.orgName} — João dos Santos`,
      cidade: 'Curitiba',
      uf: 'PR',
    },
    {
      id: org(orgId, 'asst3'),
      nome: `${tenant.orgName} — Maria Oliveira`,
      cidade: 'São José dos Pinhais',
      uf: 'PR',
    },
  ];
  for (const a of assistidos) {
    await prisma.assistido.upsert({
      where: { id: a.id },
      update: { ...a, organizationId: orgId },
      create: {
        ...a,
        organizationId: orgId,
        createdByExternalUserId: adminUser.externalUserId,
        updatedByExternalUserId: adminUser.externalUserId,
      },
    });
  }

  // 5) Visitadores e Educadores
  const visitadores = [
    {
      id: org(orgId, 'vis1'),
      nome: `${tenant.orgName} — Visitadora Helena`,
      perfis: ['ASSISTENTE_SOCIAL'],
      regioes: ['Centro', 'Norte'],
      ativo: true,
    },
    {
      id: org(orgId, 'vis2'),
      nome: `${tenant.orgName} — Visitador Marco`,
      perfis: ['PSICOLOGO'],
      regioes: ['Sul'],
      ativo: true,
    },
  ];
  for (const v of visitadores) {
    await prisma.visitador.upsert({
      where: { id: v.id },
      update: { ...v, organizationId: orgId },
      create: {
        ...v,
        organizationId: orgId,
        createdByExternalUserId: adminUser.externalUserId,
        updatedByExternalUserId: adminUser.externalUserId,
      },
    });
  }

  await prisma.educador.upsert({
    where: { id: org(orgId, 'edu1') },
    update: {
      organizationId: orgId,
      nome: `${tenant.orgName} — Educadora Sofia`,
      cargo: 'COORDENADOR',
      ativo: true,
    },
    create: {
      id: org(orgId, 'edu1'),
      organizationId: orgId,
      nome: `${tenant.orgName} — Educadora Sofia`,
      cargo: 'COORDENADOR',
      ativo: true,
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  console.log(`assistidos / visitadores / educadores ✓`);

  // 6) Matrícula de exemplo
  await prisma.matriculaAssistido.upsert({
    where: { id: org(orgId, 'matr1') },
    update: {},
    create: {
      id: org(orgId, 'matr1'),
      organizationId: orgId,
      assistidoId: org(orgId, 'asst1'),
      programaId: org(orgId, 'prog2'),
      dataInicio: new Date('2026-02-01'),
      ativa: true,
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  // 7) Solicitação de visita aprovada → triagem → visita realizada → relatório finalizado
  const solId = org(orgId, 'sol1');
  await prisma.solicitacaoVisita.upsert({
    where: { id: solId },
    update: {},
    create: {
      id: solId,
      organizationId: orgId,
      status: 'APROVADA',
      assistidoId: org(orgId, 'asst1'),
      programaId: org(orgId, 'prog2'),
      motivoPrincipalId: org(orgId, 'mot4'),
      prioridadeId: org(orgId, 'pri3'),
      descricaoDetalhada:
        'Família relata risco de evasão escolar do filho mais novo após 3 faltas consecutivas em duas semanas. Necessário acompanhamento técnico próximo.',
      dataFatoGerador: new Date('2026-04-10'),
      frequencia: 'FREQUENTE',
      acoesJaRealizadas: 'Tentativa de contato telefônico em 11/04 e 14/04, sem retorno.',
      riscoImediato: false,
      necessidadeAvaliacaoTecnica: true,
      sugestaoPerfilVisitador: 'Assistente social com experiência em adolescência',
      observacoes: 'Família já é acompanhada há 6 meses no programa.',
      solicitanteExternalUserId: users[1]?.externalUserId ?? adminUser.externalUserId,
      enviadaTriagemEm: new Date('2026-04-15T09:00:00Z'),
      triadaEm: new Date('2026-04-16T14:00:00Z'),
      triadorExternalUserId: adminUser.externalUserId,
      createdByExternalUserId: users[1]?.externalUserId ?? adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  // Triagem (decisão APROVAR_VISITA)
  await prisma.triagem.upsert({
    where: { id: org(orgId, 'tri1') },
    update: {},
    create: {
      id: org(orgId, 'tri1'),
      organizationId: orgId,
      solicitacaoId: solId,
      triadorExternalUserId: adminUser.externalUserId,
      complexidade: 'MEDIA',
      tipoAtendimentoIndicado: 'Visita técnica padrão',
      necessidadeDuplaVisita: false,
      necessidadePsicologo: false,
      necessidadeAssistenteSocial: true,
      dataLimiteRecomendada: new Date('2026-04-30'),
      justificativaTecnica:
        'Caso compatível com perfil técnico de assistente social. Visita única é suficiente em primeira abordagem.',
      decisao: 'APROVAR_VISITA',
      statusAnterior: 'EM_TRIAGEM',
      statusNovo: 'APROVADA',
      createdByExternalUserId: adminUser.externalUserId,
    },
  });

  // Visita designada e realizada
  const visitaId = org(orgId, 'vita1');
  await prisma.visita.upsert({
    where: { id: visitaId },
    update: {},
    create: {
      id: visitaId,
      organizationId: orgId,
      assistidoId: org(orgId, 'asst1'),
      visitadorId: org(orgId, 'vis1'),
      tipo: 'INICIAL',
      status: 'REALIZADA',
      dataAgendada: new Date('2026-04-20T14:00:00Z'),
      dataRealizada: new Date('2026-04-20T14:30:00Z'),
      duracaoMinutos: 60,
      endereco: 'Rua das Flores, 123 — Curitiba/PR',
      checkInEm: new Date('2026-04-20T14:25:00Z'),
      checkInPorExternalUserId: adminUser.externalUserId,
      confirmadaEm: new Date('2026-04-19T18:00:00Z'),
      confirmadaPorExternalUserId: adminUser.externalUserId,
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  // Linka solicitação → visita
  await prisma.solicitacaoVisita.update({
    where: { id: solId },
    data: { visitaId, status: 'CONVERTIDA_VISITA' },
  });

  // Relatório finalizado
  await prisma.relatorioVisita.upsert({
    where: { visitaId },
    update: {},
    create: {
      organizationId: orgId,
      visitaId,
      situacao: 'REALIZADA',
      dataExecucao: new Date('2026-04-20'),
      horaInicio: '14:30',
      horaFim: '15:30',
      presencaFamilia: true,
      composicaoFamiliar: [
        { nome: 'Mãe', idade: 38, vinculo: 'responsável' },
        { nome: 'Adolescente', idade: 14, vinculo: 'assistido' },
        { nome: 'Filha caçula', idade: 8, vinculo: 'irmã' },
      ] satisfies Prisma.InputJsonValue,
      condicoesResidencia: 'Casa simples, organizada, em região com acesso a transporte público.',
      higiene: 'Adequada.',
      alimentacao: 'Refeições regulares; participam do bolsa alimentação.',
      condicoesEmocionais: 'Mãe demonstra ansiedade quanto ao futuro do adolescente.',
      relacoesFamiliares: 'Vínculo afetivo positivo entre mãe e filhos.',
      vulnerabilidade: 'Renda baixa; única responsável.',
      analiseTecnica:
        'Família em situação de vulnerabilidade financeira moderada, mas com vínculos familiares saudáveis. Risco de evasão escolar relacionado a sobrecarga emocional do adolescente.',
      recomendacoes:
        'Manter acompanhamento mensal. Encaminhar adolescente para atividades do projeto juventude. Articular com escola para reforço escolar.',
      planoInicial:
        '1) Reunião com escola em 10 dias. 2) Inscrição no projeto juventude. 3) Visita de revisão em 30 dias.',
      criticidadeFinal: 'MEDIA',
      statusCaso: 'EM_ACOMPANHAMENTO',
      assinanteNome: 'Mãe responsável',
      finalizadoEm: new Date('2026-04-20T16:00:00Z'),
      finalizadoPorExternalUserId: adminUser.externalUserId,
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  console.log(`fluxo solicitação → triagem → visita → relatório ✓`);

  // 8) Plano de ação
  const planoId = org(orgId, 'plan1');
  await prisma.planoAcao.upsert({
    where: { id: planoId },
    update: {},
    create: {
      id: planoId,
      organizationId: orgId,
      assistidoId: org(orgId, 'asst1'),
      visitaId,
      solicitacaoId: solId,
      objetivo:
        'Reduzir risco de evasão escolar do adolescente acompanhado pela visita inicial e fortalecer vínculo com a OSC.',
      problemaPrincipal:
        'Faltas escolares recorrentes; sobrecarga emocional da responsável.',
      areaResponsavel: 'Social',
      prazo: new Date('2026-07-30'),
      indicadorSucesso: 'Frequência escolar > 90% em 3 meses consecutivos.',
      status: 'ATIVO',
      dataRevisao: new Date('2026-05-30'),
      responsaveisExternalUserIds: [adminUser.externalUserId],
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  await prisma.acaoPlano.upsert({
    where: { id: org(orgId, 'aca1') },
    update: {},
    create: {
      id: org(orgId, 'aca1'),
      organizationId: orgId,
      planoId,
      ordem: 0,
      descricao: 'Articular reunião com a escola para reforço escolar',
      responsavelExternalUserId: adminUser.externalUserId,
      prazo: new Date('2026-04-30'),
      concluida: true,
      concluidaEm: new Date('2026-04-26T11:00:00Z'),
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  await prisma.acaoPlano.upsert({
    where: { id: org(orgId, 'aca2') },
    update: {},
    create: {
      id: org(orgId, 'aca2'),
      organizationId: orgId,
      planoId,
      ordem: 1,
      descricao: 'Inscrever adolescente no projeto juventude',
      prazo: new Date('2026-05-10'),
      concluida: false,
      createdByExternalUserId: adminUser.externalUserId,
      updatedByExternalUserId: adminUser.externalUserId,
    },
  });

  await prisma.acompanhamentoPlano.upsert({
    where: { id: org(orgId, 'acm1') },
    update: {},
    create: {
      id: org(orgId, 'acm1'),
      organizationId: orgId,
      planoId,
      evolucao:
        'Reunião com a escola realizada em 26/04. Coordenação concordou em encaminhar adolescente para reforço.',
      proximosPassos: 'Inscrição no projeto juventude até 10/05.',
      necessitaNovaVisita: false,
      encerraCaso: false,
      createdByExternalUserId: adminUser.externalUserId,
    },
  });

  console.log(`plano de ação + ações + acompanhamento ✓`);
}

async function main() {
  console.log('==== Seed Gestão de Visitas ====');
  logSection('Tenant Norte');
  await seedTenant(TENANT_NORTE, USERS_NORTE);
  logSection('Tenant Sul');
  await seedTenant(TENANT_SUL, USERS_SUL);
  logSection('Resumo');
  const counts = await Promise.all([
    prisma.organizationTenant.count(),
    prisma.userRef.count(),
    prisma.assistido.count(),
    prisma.visita.count(),
    prisma.planoAcao.count(),
  ]);
  console.log({
    tenants: counts[0],
    user_refs: counts[1],
    assistidos: counts[2],
    visitas: counts[3],
    planos: counts[4],
  });
  console.log('\n✅ Seed concluído.');
}

main()
  .catch((e) => {
    console.error('❌ Falha no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
