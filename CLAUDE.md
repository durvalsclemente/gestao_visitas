# Contexto de Integração — Gestão de Visitas

Este aplicativo NÃO gerencia autenticação, usuários, organizações ou
licenciamento por conta própria. Ele é um **aplicativo cliente** do
sistema "Central de Acessos", que é o provedor único de identidade,
autorização, licenciamento e billing para todo o ecossistema de OSCs.

## Regras obrigatórias

1. **NÃO crie** telas de cadastro/login, recuperação de senha, gestão de
   usuários, gestão de organizações, planos ou pagamentos. Essas
   funcionalidades já existem na Central de Acessos e qualquer
   duplicação é proibida.

2. **NÃO crie** tabelas próprias de `users`, `organizations`,
   `sessions`, `roles` ou `permissions`. O identificador canônico do
   usuário e da organização vem da Central de Acessos (UUIDs) e deve
   ser armazenado apenas como referência (`externalUserId`,
   `organizationId`) — sem FK para tabelas locais de identidade.

3. **Autenticação** é feita via JWT emitido pela Central de Acessos.
   Este app deve apenas **validar** o token recebido no header
   `Authorization: Bearer <token>` usando a chave pública / segredo
   compartilhado fornecido pela Central. Claims esperados no JWT:
     - `sub`           → ID do usuário na Central
     - `email`         → email do usuário
     - `role`          → SUPER_ADMIN | ORG_ADMIN | ORG_USER
     - `organizationId`→ UUID da OSC
     - `iat` / `exp`

4. **Autorização dentro do app** deve se basear em (a) validade da
   licença ativa para a organização do usuário e (b) role do JWT.
   Nunca implemente um sistema de roles paralelo.

5. **Ciclo de vida da licença** é controlado pela Central via webhooks.
   Este app DEVE expor os seguintes endpoints HTTP (protegidos pelo
   header de autenticação configurado na integração — ver seção 7):

     - `POST /webhooks/provision`
         Body: `{ event: "LICENSE_PROVISIONED", licenseId, organizationId,
                  orgName, cnpj, applicationId, appSlug }`
         Ação: criar/ativar o tenant local para a organização.
         Resposta: 2xx = sucesso; qualquer outro status = falha.

     - `POST /webhooks/deprovision`
         Body: `{ event: "LICENSE_DEPROVISIONED", licenseId,
                  organizationId, applicationId, appSlug }`
         Ação: desativar o tenant (soft-disable, manter dados).

     - `POST /webhooks/user-sync`
         Body: `{ event: "USER_SYNCED", licenseId, organizationId,
                  appSlug, users: [{ id, email, name, role }] }`
         Ação: criar/atualizar referências locais aos usuários da OSC.

     - `GET /webhooks/health`
         Resposta 2xx se o app está operacional.

   Os endpoints devem ser idempotentes (pode ser chamado várias vezes
   com o mesmo payload sem efeitos colaterais).

6. **Provisionamento vs login**: receber `LICENSE_PROVISIONED` significa
   que a OSC pode acessar o app, mas NÃO cria sessão para nenhum
   usuário. O login efetivo só acontece quando um usuário autenticado
   na Central chega neste app com um JWT válido.

7. **Configuração de segredo compartilhado**: a Central de Acessos
   envia os webhooks com um header de autenticação cujo nome e valor
   são configurados no registro da `AppIntegration` lá. Este app deve
   ler o par `header/valor` esperado de variáveis de ambiente
   (ex: `CENTRAL_WEBHOOK_AUTH_HEADER`, `CENTRAL_WEBHOOK_AUTH_VALUE`) e
   rejeitar com 401 qualquer webhook que não apresente o header
   correto. Tipos suportados pela Central: `API_KEY` (header
   customizado), `BEARER` (Authorization: Bearer …), `BASIC`.

8. **Billing/pagamentos**: este app NÃO cobra, não emite fatura e não
   fala com gateway de pagamento. Se a licença estiver vencida ou
   bloqueada, a Central chamará `deprovision`; até lá, o app assume
   que a OSC está em dia.

9. **Catálogo/marketing**: a página pública de "o que é este app"
   NÃO fica neste repositório — os campos `name`, `shortDesc`,
   `description`, `iconUrl`, `screenshotUrls`, `docsUrl`, `category`,
   `tags`, `defaultLicenseType`, `defaultMonthlyPrice` são
   cadastrados manualmente na Central de Acessos em Segurança e
   Sistema → Aplicações. Não crie landing page de vendas aqui.

10. **Entrada do usuário no app**: o fluxo é sempre
    `Central de Acessos → botão "Acessar aplicação" → redireciona
    para a URL pública deste app com o JWT`. Portanto a tela inicial
    deste app deve assumir que já existe um JWT válido (via query
    string, cookie ou header conforme o handshake combinado) e ir
    direto ao conteúdo — sem tela de login.

## O que este app PODE/DEVE ter

- Um middleware/guard que valida o JWT da Central em toda rota
  protegida.
- Uma tabela local `organization_tenant` (ou equivalente) chaveada por
  `organizationId` da Central, marcando se está ativa.
- Uma tabela `user_ref` chaveada por `externalUserId`, apenas para
  guardar o que este app precisa localmente (preferências, histórico,
  dados de domínio) — sem senha, sem role, sem email como chave.
- Todo o domínio de negócio específico do app.
- Logs estruturados indicando `organizationId` e `externalUserId` em
  cada operação, para auditoria cruzada com a Central.

## Dúvidas de escopo

Sempre que encontrar um requisito que envolva "criar usuário",
"resetar senha", "controlar plano", "emitir cobrança", "cadastrar
organização" ou "definir quem é admin de quê" — **pare e pergunte**,
porque com altíssima probabilidade isso é responsabilidade da Central
de Acessos e não deste app.
