# Gestão de Visitas

App cliente da **Central de Acessos**. Não emite identidade nem
licenciamento próprio — apenas valida JWT da Central e expõe
webhooks de ciclo de vida. Veja [CLAUDE.md](CLAUDE.md) para as regras
obrigatórias de integração.

## Estrutura

```
apps/
  api/   NestJS + Prisma + PostgreSQL  (porta 3001)
  web/   Vite + React + MUI            (porta 5173)
```

## Pré-requisitos

- Node.js ≥ 20.11
- pnpm 9 (`npm i -g pnpm`)
- PostgreSQL 14+ rodando localmente (ou Docker)

## Setup

```bash
pnpm install

# Backend
cp apps/api/.env.example apps/api/.env
# preencha DATABASE_URL e os campos CENTRAL_*

pnpm prisma:generate
pnpm prisma:migrate

# Frontend
cp apps/web/.env.example apps/web/.env
```

## Executar em dev

```bash
pnpm dev          # sobe api + web em paralelo
# ou separado:
pnpm dev:api
pnpm dev:web
```

- Backend: <http://localhost:3001>
- Frontend: <http://localhost:5173> (proxy `/api → 3001`)

## Como o login funciona

Não há tela de login local. O fluxo é:

1. Usuário entra na Central de Acessos.
2. Clica em "Acessar aplicação" → Central redireciona para
   `https://gestao-visitas/?token=<JWT>`.
3. O frontend captura o token, guarda em `sessionStorage` e remove
   da URL.
4. Toda chamada à API envia `Authorization: Bearer <JWT>`.
5. Sem token (ou token inválido/expirado), o app redireciona para
   `VITE_CENTRAL_URL/login?redirect=...`.

## Webhooks (a serem implementados nos próximos blocos)

| Método | Rota                    | Função                          |
|--------|-------------------------|---------------------------------|
| POST   | `/webhooks/provision`   | Ativa tenant da OSC             |
| POST   | `/webhooks/deprovision` | Suspende tenant                 |
| POST   | `/webhooks/user-sync`   | Atualiza referências de usuário |
| GET    | `/webhooks/health`      | Liveness + DB                   |

Todos protegidos por `WebhookAuthGuard` (header configurável via
`CENTRAL_WEBHOOK_AUTH_HEADER` / `..._VALUE`).

## Seed de demonstração

Popula 2 tenants (Norte / Sul) com fluxo completo de negócio
(usuários simulados, assistidos, programas, solicitação aprovada,
triagem, visita realizada, relatório finalizado, plano de ação
com acompanhamento). Idempotente — pode rodar múltiplas vezes.

```bash
pnpm --filter @gestao-visitas/api run prisma:seed
```

**IDs determinísticos** dos tenants seedados (úteis para gerar
JWT de teste pela Central):

| Tenant | organizationId | Admin externalUserId |
|---|---|---|
| OSC Demo Norte | `11111111-1111-1111-1111-111111111111` | `a1aaaaaa-1111-1111-1111-111111111111` |
| OSC Demo Sul   | `22222222-2222-2222-2222-222222222222` | `b1bbbbbb-2222-2222-2222-222222222222` |

## Testes

```bash
pnpm --filter @gestao-visitas/api test
```

Cobertura focada em **isolamento multi-tenant + auditoria**:
- `assistidos.service.spec.ts` — JWT do tenant A não acessa registro
  do tenant B; audit é chamado em create/update/delete; `createdByExternalUserId`
  vem do JWT, jamais do payload.
- `triagem.service.spec.ts` — máquina de estado (assumir/decidir),
  cross-tenant retorna 404, devolução libera triador.
- `integration.service.spec.ts` — idempotência (hash estável mesmo
  com reordenação), deprovision soft-disable, user-sync upsert.
- `jwt.strategy.spec.ts` — payload sem claims obrigatórios → 401.

Cobertura completa de auditoria e governança em [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

## Próximos blocos

- Pipeline real de upload de documentos (S3/MinIO).
- Job de retenção (`AuditLog > 24 meses`, `WebhookDelivery > 90 dias`).
- Rate limiting em webhooks e dashboard.
- Lock atômico em `triagem.assumir`.
