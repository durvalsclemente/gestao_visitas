# Security Review — Gestão de Visitas

Data da revisão: **2026-04-28**
Escopo: API NestJS (`apps/api`) e SPA React (`apps/web`).

Este documento registra a varredura de segurança e isolamento
multi-tenant exigida pelo Bloco 19 e referencia as regras do
[CLAUDE.md](CLAUDE.md).

---

## 1. Identidade local

**Regra (§1, §2):** este app NÃO emite identidade. Sem `User`,
`Organization`, `Session`, `Role`, `Permission`, `Login`, `Senha`,
`Recuperação de senha`, `Plano`, `Cobrança`.

| Verificação | Resultado |
|---|---|
| Schema Prisma contém `User` ou `Session` | ✅ Ausentes. |
| Schema Prisma contém `Role` ou `Permission` local | ✅ Ausentes. `centralRole` é projetado do JWT em runtime, não persiste. |
| Existe rota de login/cadastro/reset | ✅ Ausente. `apps/web` redireciona à Central quando não há JWT. |
| Existe modelo de billing/payment | ✅ Ausente. |
| Tabelas de identidade local | ✅ Apenas `OrganizationTenant` (referência ao tenant da Central) e `UserRef` (cache informativo, sem senha/role autoritativa). |
| `UserRef.lastKnownCentralRole` consultado para autorização | ✅ Não. Nenhum service consulta — `RolesGuard` lê apenas `req.user.centralRole` do JWT. |

`grep` realizado: nenhum match para `password`, `senha:`, `bcrypt`,
`session.create`, `signup`, `register` em `apps/api/src` (à exceção de
configurações de redact em logs).

---

## 2. JWT obrigatório nas rotas protegidas

**Regra (§3):** validar `Authorization: Bearer <token>` em toda rota
protegida. O `JwtAuthGuard` é registrado como `APP_GUARD` global em
[`app.module.ts`](apps/api/src/app.module.ts).

Rotas marcadas `@Public()` (escapam do JWT):

| Rota | Justificativa |
|---|---|
| `GET /health` | Liveness probe pública. |
| `GET /webhooks/health` | Health probe da Central. |
| `POST /webhooks/provision` | Webhook da Central — autenticado por header compartilhado (`WebhookAuthGuard`). |
| `POST /webhooks/deprovision` | idem |
| `POST /webhooks/user-sync` | idem |

Nenhuma outra rota é pública. O `RolesGuard` global respeita
`@Roles(...)` aplicado por endpoint.

---

## 3. Isolamento multi-tenant

**Regra (§2):** toda query de domínio filtra por `organizationId`.

### 3.1. Mecanismos de defesa

1. `JwtStrategy` extrai `organizationId` do JWT (sub-claim).
2. `TenantInterceptor` injeta no `AsyncLocalStorage`.
3. `TenantGuard` verifica que a OSC está provisionada e ativa.
4. Services chamam `requireTenant()` antes de qualquer query.

### 3.2. Auditoria de uso

`grep` nos services que tocam Prisma (14 arquivos) × `grep` por
`requireTenant()`: **100% de cobertura** — todos chamam.

| Service | requireTenant() |
|---|---|
| AssistidosService | ✅ |
| EducadoresService | ✅ |
| VisitadoresService | ✅ |
| DisponibilidadesService | ✅ |
| VisitasService | ✅ |
| RelatoriosVisitaService | ✅ |
| RelatorioPdfService | ✅ |
| SolicitacoesVisitaService | ✅ |
| TriagemService | ✅ |
| PlanosAcaoService | ✅ |
| HistoricoAssistidoService | ✅ |
| DashboardService | ✅ (em todas as 16 queries paralelas) |
| DocumentosService | ✅ |
| ParametrosService | ✅ |
| AuditReadService | ✅ |
| LookupCrudHelper (motivos/encaminhamentos/status/prioridades) | ✅ (6 chamadas) |

### 3.3. Raw SQL (Dashboard)

`DashboardService` usa `$queryRaw` em 8 queries. **Todas parametrizadas**
com interpolação Prisma `${orgId}` — não há string concatenada.
Sem risco de SQL injection ou cross-tenant via raw query.

### 3.4. FKs externas no payload

Services validam que `assistidoId`/`visitaId`/`programaId`/etc.
informados pelo cliente pertencem ao mesmo tenant antes de gravar:

- `SolicitacoesVisitaService.assertReferencesInTenant`
- `TriagemService.assertReferenceTenants`
- `PlanosAcaoService.assertReferences`
- `DocumentosService.assertParentInTenant`
- `VisitasService.assertVisitadorAtivo`
- `HistoricoAssistidoService.assertAssistidoExists` / `assertProgramaExists`

---

## 4. Webhooks da Central

**Regra (§5, §7):** endpoints obrigatórios + idempotência + segredo
compartilhado configurável.

| Verificação | Resultado |
|---|---|
| 4 endpoints obrigatórios | ✅ `/webhooks/provision`, `/webhooks/deprovision`, `/webhooks/user-sync`, `/webhooks/health`. |
| `WebhookAuthGuard` lê header configurável | ✅ `CENTRAL_WEBHOOK_AUTH_HEADER` + `CENTRAL_WEBHOOK_AUTH_VALUE`. |
| Suporta `API_KEY`, `BEARER`, `BASIC` | ✅ |
| Comparação timing-safe | ✅ `crypto.timingSafeEqual`. |
| Idempotência | ✅ `WebhookDelivery` com `@@unique([event, payloadHash])`. Hash SHA-256 estável (`stableStringify`). Replay → `200 ignored_duplicate`. |
| Transação atômica (delivery + mutação) | ✅ `IntegrationService.runIdempotent`. |

---

## 5. Auditoria com `externalUserId`

**Regra (Bloco 18):** toda mutação relevante registra
`organizationId`, `externalUserId`, ação, entidade, before/after,
data/hora e origem.

| Mecanismo | Cobertura |
|---|---|
| `AuditInterceptor` global (auto-trail mínimo) | ✅ Toda mutação HTTP (`POST/PUT/PATCH/DELETE`). |
| `AuditService.record(...)` (diff rico, opcional) | Aplicado em: `AssistidosService` (create/update/delete), `TriagemService.decidir`, `VisitasService.designar/cancelar`. |
| `externalUserId` vem do JWT, não do payload | ✅ Sempre via `tenantStorage.externalUserId` — DTO não expõe campo. |
| Correlação com a Central | ✅ Cada log carrega `externalUserId` (UUID Central) + `requestId` (X-Request-Id ecoado). |
| Sanitização de campos sensíveis | ✅ `sanitize()` redacta `password`, `senha`, `token`, `assinaturaImagem`. |

Pendente (próximos blocos): replicar `audit.record` rico em
`PlanosAcaoService`, `DocumentosService`, `RelatoriosVisitaService`.

---

## 6. Permissões e RBAC

**Regra (§4):** autorização baseada em (a) tenant ativo + (b) role do
JWT. Sem role local.

### 6.1. Endpoints restritos a `ORG_ADMIN` ou `SUPER_ADMIN`

Aplicado neste bloco:

| Módulo | Endpoint | Decorator |
|---|---|---|
| Audit | `GET /audit` | `@Roles('ORG_ADMIN','SUPER_ADMIN')` (controller-level) |
| Triagem | `POST /triagem/solicitacao/:id/assumir` | idem |
| Triagem | `POST /triagem/solicitacao/:id/decidir` | idem |
| Visitas | `POST /visitas/designar` | idem |
| Visitas | `PATCH /visitas/:id/reagendar` | idem |
| Visitas | `PATCH /visitas/:id/cancelar` | idem |
| Programas | `POST/PATCH/DELETE /programas` | idem |
| Motivos | `POST/PATCH/DELETE /motivos-visita` | idem |
| Encaminhamentos | `POST/PATCH/DELETE /tipos-encaminhamento` | idem |
| Prioridades | `POST/PATCH/DELETE /prioridades` | idem |
| Status | `POST/PATCH/DELETE /status` | idem |
| Parâmetros | `POST/PATCH/DELETE /parametros` | idem |
| Matrículas | `POST/PATCH/DELETE /matriculas` | idem |

### 6.2. Endpoints abertos a qualquer role autenticada

- CRUD de cadastros operacionais (`/assistidos`, `/educadores`,
  `/visitadores`, `/solicitacoes-visita`, `/planos-acao`).
- Operações de execução (`/visitas/:id/check-in`, `relatorio/*`,
  `confirmar`, `realizar`).
- Documentos (sigilo já filtra leitura via `DocumentosService.accessibleWhere`).
- Dashboard (somente leitura agregada).

Decisão consciente: ORG_USER opera o dia a dia. Apenas decisões
de gestão (designação, triagem, configuração, auditoria) ficam
restritas.

### 6.3. Sigilo em Documentos

Verificado em `DocumentosService`:
- `PUBLICO`: visível a qualquer role do tenant.
- `RESTRITO`: visível a uploader + `ORG_ADMIN` + `SUPER_ADMIN`.
- `CONFIDENCIAL`: visível só ao uploader e `SUPER_ADMIN`.

Aplicado em `accessibleWhere` (filtro de listagem) e `canAccess`
(verificação individual). `canModify` requer ser uploader ou admin.

---

## 7. Hardening de transporte e infra

| Verificação | Resultado |
|---|---|
| CORS restrito por env | ✅ `CORS_ORIGIN` controla origem; em prod deve apontar para a SPA pública. |
| Helmet habilitado | ✅ `@fastify/helmet` registrado em `main.ts`. |
| `bodyLimit` adequado | ✅ Elevado para 5 MB para suportar `assinaturaImagem` (até 2,5 MB) e payloads de execução. |
| `trustProxy: true` no Fastify | ✅ Necessário se o app fica atrás de Nginx/Caddy/Cloudflare. |
| TLS | ⚠️ Responsabilidade do reverse proxy. Documentar para deploy. |
| Rate limiting | ⚠️ Não implementado. Recomendado em `/webhooks/*` (60 req/min/IP) e em rotas de leitura caras (dashboard). |
| `X-Request-Id` ecoado | ✅ `genReqId` no Pino aceita header de entrada e ecoa. |

---

## 8. Logs estruturados

| Verificação | Resultado |
|---|---|
| Pino `customProps` enriquece logs com `organizationId`/`externalUserId` | ✅ |
| Pino `redact` cobre `Authorization`, `cookie`, `password`, `senha`, `token`, `assinaturaImagem` | ✅ |
| `requestId` (X-Request-Id) propagado para `AuditLog.meta` | ✅ |

---

## 9. Findings & fixes deste bloco

### Finding 1 — `GET /audit` aberto a qualquer ORG_USER
**Risco:** ORG_USER vê o que ORG_ADMIN fez (não cross-tenant, mas
ainda assim vazamento de governança interna).
**Fix:** `@Roles('ORG_ADMIN','SUPER_ADMIN')` no `AuditController`.

### Finding 2 — `bodyLimit` Fastify default (1 MB) menor que `assinaturaImagem` (2,5 MB)
**Risco:** finalização de relatório de visita rejeitada com 413.
**Fix:** `bodyLimit: 5 * 1024 * 1024` em `main.ts`.

### Finding 3 — Mutações sensíveis abertas a qualquer ORG_USER
**Risco:** ORG_USER junior pode designar visita, decidir triagem,
alterar configuração da OSC.
**Fix:** `@Roles('ORG_ADMIN','SUPER_ADMIN')` em 13 endpoints
(triagem, visitas críticas, configurações, matrículas).

### Finding 4 — Transições críticas sem audit rico
**Risco:** trail mínimo do interceptor não captura o motivo /
contexto da decisão. Difícil reconstituir caso a caso.
**Fix:** `audit.record` instrumentado em `TriagemService.decidir` e
em `VisitasService.designar/cancelar` com `meta` específica
(decisão, motivo, status anterior/novo).

### Não-finding (verificações OK)
- Cross-tenant em `$queryRaw`: parametrizado em todos os 8 casos.
- `requireTenant()` em 100% dos services com Prisma.
- `WebhookAuthGuard` com timing-safe compare.
- Idempotência de webhooks via `WebhookDelivery` único.
- Sigilo de documentos centralizado e testado.

---

## 10. Próximas pendências (fora deste bloco)

1. Replicar `audit.record` rico em `PlanosAcaoService`,
   `DocumentosService`, `RelatoriosVisitaService`.
2. Job de retenção de `AuditLog > 24 meses` e
   `WebhookDelivery > 90 dias`.
3. Rate limiting em webhooks e dashboard.
4. Pipeline real de upload de documentos (S3/MinIO + magic bytes).
5. Verificação de `mimeType` server-side via `file-type` lib.
6. Lock atômico em `triagem.assumir` (atual é otimista).
7. Migrar `VisitaAnexo`/`SolicitacaoVisitaAnexo` legados para
   `Documento` unificado.
