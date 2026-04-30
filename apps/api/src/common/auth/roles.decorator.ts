// Decorator histórico migrado para PBAC (ADR 002).
// Use `@RequireAction(...)` em novos handlers — `@Roles(...)` é re-exportado como
// alias de `@RequireAction` para reduzir churn em controllers existentes.
//
// Mapeamento usado no port para gestao_visitas:
//   @Roles('SUPER_ADMIN', 'ORG_ADMIN')  → @RequireAction('visits.manage')
//   @Roles('ORG_USER')                  → @RequireAction('visits.view')
// Cada controller recebeu o code apropriado em sua nova assinatura.
export { RequireAction as Roles } from '@osc/auth-nest';
