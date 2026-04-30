import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { validateEnv } from './config/env.validation';
import { AuthModule } from './common/auth/auth.module';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { TenantGuard } from './common/tenant/tenant.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { AssistidosModule } from './modules/assistidos/assistidos.module';
import { EducadoresModule } from './modules/educadores/educadores.module';
import { VisitadoresModule } from './modules/visitadores/visitadores.module';
import { LookupModule } from './common/lookup/lookup.module';
import { MotivosVisitaModule } from './modules/motivos-visita/motivos-visita.module';
import { TiposEncaminhamentoModule } from './modules/tipos-encaminhamento/tipos-encaminhamento.module';
import { PrioridadesModule } from './modules/prioridades/prioridades.module';
import { StatusModule } from './modules/status/status.module';
import { ProgramasModule } from './modules/programas/programas.module';
import { ParametrosModule } from './modules/parametros/parametros.module';
import { SolicitacoesVisitaModule } from './modules/solicitacoes-visita/solicitacoes-visita.module';
import { TriagemModule } from './modules/triagem/triagem.module';
import { VisitasModule } from './modules/visitas/visitas.module';
import { PlanosAcaoModule } from './modules/planos-acao/planos-acao.module';
import { HistoricoAssistidoModule } from './modules/historico-assistido/historico-assistido.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { AuditReadModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
        // Cada request ganha um id próprio (X-Request-Id ou UUID v4).
        // Reaproveitado pelo AuditService como `requestId` em meta.
        genReqId: (req, res) => {
          const incoming = (req.headers['x-request-id'] as string | undefined) ?? null;
          const id = incoming ?? randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        // Enriquecer todo log com tenant + uploader quando disponível.
        customProps: (req) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const user = (req as any).user as
            | { externalUserId?: string; organizationId?: string }
            | undefined;
          return {
            organizationId: user?.organizationId,
            externalUserId: user?.externalUserId,
          };
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.senha',
            'req.body.assinaturaImagem',
            'req.body.token',
            '*.password',
            '*.assinaturaImagem',
          ],
          remove: true,
        },
      },
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    MeModule,
    IntegrationModule,
    AssistidosModule,
    EducadoresModule,
    VisitadoresModule,
    LookupModule,
    MotivosVisitaModule,
    TiposEncaminhamentoModule,
    PrioridadesModule,
    StatusModule,
    ProgramasModule,
    ParametrosModule,
    SolicitacoesVisitaModule,
    TriagemModule,
    VisitasModule,
    PlanosAcaoModule,
    HistoricoAssistidoModule,
    DashboardModule,
    DocumentosModule,
    AuditModule,
    AuditReadModule,
  ],
  providers: [
    // CentralAuthGuard + ActionsGuard são registrados em AuthModule via APP_GUARD.
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
