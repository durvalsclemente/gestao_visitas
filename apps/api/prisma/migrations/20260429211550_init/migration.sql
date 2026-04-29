-- CreateEnum
CREATE TYPE "EducadorCargo" AS ENUM ('EDUCADOR', 'COORDENADOR');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "VisitaTipo" AS ENUM ('INICIAL', 'ACOMPANHAMENTO', 'ENCERRAMENTO', 'EMERGENCIAL');

-- CreateEnum
CREATE TYPE "VisitaStatus" AS ENUM ('AGENDADA', 'REALIZADA', 'NAO_REALIZADA', 'CANCELADA', 'REAGENDADA');

-- CreateEnum
CREATE TYPE "SituacaoVisita" AS ENUM ('REALIZADA', 'NAO_REALIZADA');

-- CreateEnum
CREATE TYPE "MotivoNaoRealizacao" AS ENUM ('ASSISTIDO_AUSENTE', 'ENDERECO_NAO_LOCALIZADO', 'RECUSA_DE_ATENDIMENTO', 'RECUSA_DA_FAMILIA', 'CONDICOES_INSEGURAS', 'IMPREVISTO_VISITADOR', 'OUTRO');

-- CreateEnum
CREATE TYPE "Criticidade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'MUITO_ALTA');

-- CreateEnum
CREATE TYPE "StatusCaso" AS ENUM ('ATIVO', 'EM_ACOMPANHAMENTO', 'ENCAMINHADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ProgramaTipo" AS ENUM ('ATIVIDADE', 'CURSO', 'PROJETO');

-- CreateEnum
CREATE TYPE "PlanoAcaoStatus" AS ENUM ('RASCUNHO', 'ATIVO', 'EM_REVISAO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SolicitacaoVisitaStatus" AS ENUM ('RASCUNHO', 'ENVIADA_TRIAGEM', 'EM_TRIAGEM', 'APROVADA', 'REJEITADA', 'ENCAMINHADA', 'CONVERTIDA_VISITA');

-- CreateEnum
CREATE TYPE "TriagemComplexidade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'MUITO_ALTA');

-- CreateEnum
CREATE TYPE "TriagemDecisao" AS ENUM ('APROVAR_VISITA', 'DEVOLVER_COMPLEMENTACAO', 'REJEITAR', 'RECLASSIFICAR_PRIORIDADE', 'ENCAMINHAR_OUTRO_SETOR');

-- CreateEnum
CREATE TYPE "FrequenciaFatoGerador" AS ENUM ('UNICA', 'ESPORADICA', 'FREQUENTE', 'CONTINUA');

-- CreateEnum
CREATE TYPE "NivelSigilo" AS ENUM ('PUBLICO', 'RESTRITO', 'CONFIDENCIAL');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('IDENTIDADE', 'COMPROVANTE_RESIDENCIA', 'LAUDO_MEDICO', 'LAUDO_PSICOLOGICO', 'LAUDO_ASSISTENCIAL', 'RELATORIO_TECNICO', 'PARECER_JURIDICO', 'PRONTUARIO', 'AUTORIZACAO', 'TERMO_CONSENTIMENTO', 'FOTO', 'OUTRO');

-- CreateTable
CREATE TABLE "organization_tenants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "licenseId" TEXT,
    "orgName" TEXT,
    "cnpj" TEXT,
    "appSlug" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "provisionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_refs" (
    "id" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "lastKnownCentralRole" TEXT,
    "preferences" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistidos" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "dataNascimento" DATE,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "cep" TEXT,
    "observacoes" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assistidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas_assistido" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assistidoId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "matriculas_assistido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educadores" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cargo" "EducadorCargo" NOT NULL DEFAULT 'EDUCADOR',
    "formacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "externalUserId" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "educadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitadores" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "perfis" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regioes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalUserId" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visitadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitador_disponibilidades" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "visitadorId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visitador_disponibilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assistidoId" TEXT NOT NULL,
    "visitadorId" TEXT NOT NULL,
    "visitadorSecundarioId" TEXT,
    "tipo" "VisitaTipo" NOT NULL,
    "status" "VisitaStatus" NOT NULL DEFAULT 'AGENDADA',
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "dataRealizada" TIMESTAMP(3),
    "duracaoMinutos" INTEGER,
    "endereco" TEXT,
    "observacoes" TEXT,
    "resultado" TEXT,
    "confirmadaEm" TIMESTAMP(3),
    "confirmadaPorExternalUserId" TEXT,
    "motivoCancelamento" TEXT,
    "motivoReagendamento" TEXT,
    "reagendamentoCount" INTEGER NOT NULL DEFAULT 0,
    "checkInEm" TIMESTAMP(3),
    "checkInPorExternalUserId" TEXT,
    "checkInLatitude" DOUBLE PRECISION,
    "checkInLongitude" DOUBLE PRECISION,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_anexos" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "visita_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programas" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "tipo" "ProgramaTipo" NOT NULL DEFAULT 'ATIVIDADE',
    "descricao" TEXT,
    "cor" TEXT,
    "cargaHoraria" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "programas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivos_visita" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "motivos_visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_encaminhamento" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tipos_encaminhamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prioridades" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "cor" TEXT,
    "nivel" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prioridades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_customizados" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "cor" TEXT,
    "categoria" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "status_customizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_app" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_app_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios_visita" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "finalizadoEm" TIMESTAMP(3),
    "finalizadoPorExternalUserId" TEXT,
    "dataExecucao" TIMESTAMP(3),
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "presencaFamilia" BOOLEAN NOT NULL DEFAULT false,
    "situacao" "SituacaoVisita",
    "motivoNaoRealizacao" "MotivoNaoRealizacao",
    "observacoesNaoRealizacao" TEXT,
    "condicoesResidencia" TEXT,
    "composicaoFamiliar" JSONB,
    "higiene" TEXT,
    "alimentacao" TEXT,
    "condicoesEmocionais" TEXT,
    "relacoesFamiliares" TEXT,
    "redeApoio" TEXT,
    "vulnerabilidade" TEXT,
    "comportamentoAssistido" TEXT,
    "relatos" TEXT,
    "dificuldades" TEXT,
    "impactosOsc" TEXT,
    "analiseTecnica" TEXT,
    "fatoresAgravantes" TEXT,
    "fatoresProtetivos" TEXT,
    "recomendacoes" TEXT,
    "planoInicial" TEXT,
    "criticidadeFinal" "Criticidade",
    "statusCaso" "StatusCaso",
    "assinanteNome" TEXT,
    "assinaturaImagem" TEXT,
    "assinadoEm" TIMESTAMP(3),
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relatorios_visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_acao" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assistidoId" TEXT NOT NULL,
    "visitaId" TEXT,
    "solicitacaoId" TEXT,
    "objetivo" TEXT NOT NULL,
    "problemaPrincipal" TEXT NOT NULL,
    "areaResponsavel" TEXT,
    "prazo" TIMESTAMP(3),
    "indicadorSucesso" TEXT,
    "status" "PlanoAcaoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "dataRevisao" TIMESTAMP(3),
    "responsaveisExternalUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "planos_acao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoes_plano" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "responsavelExternalUserId" TEXT,
    "prazo" TIMESTAMP(3),
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "concluidaEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "acoes_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acompanhamentos_plano" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "evolucao" TEXT NOT NULL,
    "dificuldades" TEXT,
    "proximosPassos" TEXT,
    "necessitaNovaVisita" BOOLEAN NOT NULL DEFAULT false,
    "encerraCaso" BOOLEAN NOT NULL DEFAULT false,
    "createdByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acompanhamentos_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_visita" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "SolicitacaoVisitaStatus" NOT NULL DEFAULT 'RASCUNHO',
    "assistidoId" TEXT NOT NULL,
    "programaId" TEXT,
    "motivoPrincipalId" TEXT,
    "prioridadeId" TEXT,
    "descricaoDetalhada" TEXT NOT NULL,
    "dataFatoGerador" DATE NOT NULL,
    "frequencia" "FrequenciaFatoGerador" NOT NULL,
    "acoesJaRealizadas" TEXT,
    "riscoImediato" BOOLEAN NOT NULL DEFAULT false,
    "necessidadeAvaliacaoTecnica" BOOLEAN NOT NULL DEFAULT false,
    "sugestaoPerfilVisitador" TEXT,
    "observacoes" TEXT,
    "solicitanteExternalUserId" TEXT NOT NULL,
    "triadorExternalUserId" TEXT,
    "enviadaTriagemEm" TIMESTAMP(3),
    "triadaEm" TIMESTAMP(3),
    "visitaId" TEXT,
    "createdByExternalUserId" TEXT,
    "updatedByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "solicitacoes_visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_visita_anexos" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "solicitacao_visita_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triagens" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "triadorExternalUserId" TEXT NOT NULL,
    "complexidade" "TriagemComplexidade" NOT NULL,
    "tipoAtendimentoIndicado" TEXT,
    "necessidadeDuplaVisita" BOOLEAN NOT NULL DEFAULT false,
    "necessidadePsicologo" BOOLEAN NOT NULL DEFAULT false,
    "necessidadeAssistenteSocial" BOOLEAN NOT NULL DEFAULT false,
    "dataLimiteRecomendada" DATE,
    "justificativaTecnica" TEXT NOT NULL,
    "decisao" "TriagemDecisao" NOT NULL,
    "prioridadeReclassificadaId" TEXT,
    "setorEncaminhamentoId" TEXT,
    "statusAnterior" "SolicitacaoVisitaStatus" NOT NULL,
    "statusNovo" "SolicitacaoVisitaStatus" NOT NULL,
    "createdByExternalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "licenseId" TEXT,
    "organizationId" TEXT,
    "payloadHash" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "externalUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'OUTRO',
    "sigilo" "NivelSigilo" NOT NULL DEFAULT 'RESTRITO',
    "nome" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "hash" TEXT,
    "descricao" TEXT,
    "assistidoId" TEXT,
    "solicitacaoId" TEXT,
    "visitaId" TEXT,
    "relatorioId" TEXT,
    "planoAcaoId" TEXT,
    "uploadedByExternalUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByExternalUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SolicitacaoMotivosSecundarios" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_tenants_organizationId_key" ON "organization_tenants"("organizationId");

-- CreateIndex
CREATE INDEX "organization_tenants_active_idx" ON "organization_tenants"("active");

-- CreateIndex
CREATE INDEX "user_refs_organizationId_idx" ON "user_refs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_refs_organizationId_externalUserId_key" ON "user_refs"("organizationId", "externalUserId");

-- CreateIndex
CREATE INDEX "assistidos_organizationId_deletedAt_idx" ON "assistidos"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "assistidos_organizationId_nome_idx" ON "assistidos"("organizationId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "assistidos_organizationId_cpf_key" ON "assistidos"("organizationId", "cpf");

-- CreateIndex
CREATE INDEX "matriculas_assistido_organizationId_assistidoId_deletedAt_idx" ON "matriculas_assistido"("organizationId", "assistidoId", "deletedAt");

-- CreateIndex
CREATE INDEX "matriculas_assistido_organizationId_programaId_deletedAt_idx" ON "matriculas_assistido"("organizationId", "programaId", "deletedAt");

-- CreateIndex
CREATE INDEX "educadores_organizationId_deletedAt_idx" ON "educadores"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "educadores_organizationId_ativo_idx" ON "educadores"("organizationId", "ativo");

-- CreateIndex
CREATE INDEX "educadores_organizationId_nome_idx" ON "educadores"("organizationId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "educadores_organizationId_externalUserId_key" ON "educadores"("organizationId", "externalUserId");

-- CreateIndex
CREATE INDEX "visitadores_organizationId_deletedAt_idx" ON "visitadores"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "visitadores_organizationId_ativo_idx" ON "visitadores"("organizationId", "ativo");

-- CreateIndex
CREATE INDEX "visitadores_organizationId_nome_idx" ON "visitadores"("organizationId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "visitadores_organizationId_externalUserId_key" ON "visitadores"("organizationId", "externalUserId");

-- CreateIndex
CREATE INDEX "visitador_disponibilidades_organizationId_visitadorId_ativo_idx" ON "visitador_disponibilidades"("organizationId", "visitadorId", "ativo");

-- CreateIndex
CREATE INDEX "visitador_disponibilidades_organizationId_diaSemana_ativo_idx" ON "visitador_disponibilidades"("organizationId", "diaSemana", "ativo");

-- CreateIndex
CREATE INDEX "visitas_organizationId_deletedAt_idx" ON "visitas"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "visitas_organizationId_status_dataAgendada_idx" ON "visitas"("organizationId", "status", "dataAgendada");

-- CreateIndex
CREATE INDEX "visitas_organizationId_assistidoId_idx" ON "visitas"("organizationId", "assistidoId");

-- CreateIndex
CREATE INDEX "visitas_organizationId_visitadorId_dataAgendada_idx" ON "visitas"("organizationId", "visitadorId", "dataAgendada");

-- CreateIndex
CREATE INDEX "visitas_organizationId_visitadorSecundarioId_dataAgendada_idx" ON "visitas"("organizationId", "visitadorSecundarioId", "dataAgendada");

-- CreateIndex
CREATE INDEX "visitas_organizationId_dataAgendada_idx" ON "visitas"("organizationId", "dataAgendada");

-- CreateIndex
CREATE INDEX "visita_anexos_organizationId_visitaId_deletedAt_idx" ON "visita_anexos"("organizationId", "visitaId", "deletedAt");

-- CreateIndex
CREATE INDEX "programas_organizationId_deletedAt_idx" ON "programas"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "programas_organizationId_tipo_ativo_idx" ON "programas"("organizationId", "tipo", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "programas_organizationId_codigo_key" ON "programas"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "motivos_visita_organizationId_deletedAt_idx" ON "motivos_visita"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "motivos_visita_organizationId_codigo_key" ON "motivos_visita"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "tipos_encaminhamento_organizationId_deletedAt_idx" ON "tipos_encaminhamento"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_encaminhamento_organizationId_codigo_key" ON "tipos_encaminhamento"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "prioridades_organizationId_deletedAt_idx" ON "prioridades"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "prioridades_organizationId_codigo_key" ON "prioridades"("organizationId", "codigo");

-- CreateIndex
CREATE INDEX "status_customizados_organizationId_deletedAt_idx" ON "status_customizados"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "status_customizados_organizationId_categoria_ativo_idx" ON "status_customizados"("organizationId", "categoria", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "status_customizados_organizationId_categoria_codigo_key" ON "status_customizados"("organizationId", "categoria", "codigo");

-- CreateIndex
CREATE INDEX "parametros_app_organizationId_categoria_idx" ON "parametros_app"("organizationId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_app_organizationId_chave_key" ON "parametros_app"("organizationId", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_visita_visitaId_key" ON "relatorios_visita"("visitaId");

-- CreateIndex
CREATE INDEX "relatorios_visita_organizationId_criticidadeFinal_idx" ON "relatorios_visita"("organizationId", "criticidadeFinal");

-- CreateIndex
CREATE INDEX "relatorios_visita_organizationId_statusCaso_idx" ON "relatorios_visita"("organizationId", "statusCaso");

-- CreateIndex
CREATE INDEX "planos_acao_organizationId_deletedAt_idx" ON "planos_acao"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "planos_acao_organizationId_status_prazo_idx" ON "planos_acao"("organizationId", "status", "prazo");

-- CreateIndex
CREATE INDEX "planos_acao_organizationId_assistidoId_idx" ON "planos_acao"("organizationId", "assistidoId");

-- CreateIndex
CREATE INDEX "acoes_plano_organizationId_planoId_ordem_idx" ON "acoes_plano"("organizationId", "planoId", "ordem");

-- CreateIndex
CREATE INDEX "acompanhamentos_plano_organizationId_planoId_createdAt_idx" ON "acompanhamentos_plano"("organizationId", "planoId", "createdAt");

-- CreateIndex
CREATE INDEX "solicitacoes_visita_organizationId_deletedAt_idx" ON "solicitacoes_visita"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "solicitacoes_visita_organizationId_status_createdAt_idx" ON "solicitacoes_visita"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "solicitacoes_visita_organizationId_solicitanteExternalUserI_idx" ON "solicitacoes_visita"("organizationId", "solicitanteExternalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "solicitacao_visita_anexos_organizationId_solicitacaoId_dele_idx" ON "solicitacao_visita_anexos"("organizationId", "solicitacaoId", "deletedAt");

-- CreateIndex
CREATE INDEX "triagens_organizationId_solicitacaoId_createdAt_idx" ON "triagens"("organizationId", "solicitacaoId", "createdAt");

-- CreateIndex
CREATE INDEX "triagens_organizationId_triadorExternalUserId_createdAt_idx" ON "triagens"("organizationId", "triadorExternalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_deliveries_organizationId_receivedAt_idx" ON "webhook_deliveries"("organizationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_event_payloadHash_key" ON "webhook_deliveries"("event", "payloadHash");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_occurredAt_idx" ON "audit_logs"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_externalUserId_occurredAt_idx" ON "audit_logs"("externalUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_deletedAt_idx" ON "documentos"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_assistidoId_deletedAt_idx" ON "documentos"("organizationId", "assistidoId", "deletedAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_solicitacaoId_deletedAt_idx" ON "documentos"("organizationId", "solicitacaoId", "deletedAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_visitaId_deletedAt_idx" ON "documentos"("organizationId", "visitaId", "deletedAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_relatorioId_deletedAt_idx" ON "documentos"("organizationId", "relatorioId", "deletedAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_planoAcaoId_deletedAt_idx" ON "documentos"("organizationId", "planoAcaoId", "deletedAt");

-- CreateIndex
CREATE INDEX "documentos_organizationId_sigilo_tipo_idx" ON "documentos"("organizationId", "sigilo", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "_SolicitacaoMotivosSecundarios_AB_unique" ON "_SolicitacaoMotivosSecundarios"("A", "B");

-- CreateIndex
CREATE INDEX "_SolicitacaoMotivosSecundarios_B_index" ON "_SolicitacaoMotivosSecundarios"("B");

-- AddForeignKey
ALTER TABLE "user_refs" ADD CONSTRAINT "user_refs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistidos" ADD CONSTRAINT "assistidos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_assistido" ADD CONSTRAINT "matriculas_assistido_assistidoId_fkey" FOREIGN KEY ("assistidoId") REFERENCES "assistidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_assistido" ADD CONSTRAINT "matriculas_assistido_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educadores" ADD CONSTRAINT "educadores_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitadores" ADD CONSTRAINT "visitadores_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitador_disponibilidades" ADD CONSTRAINT "visitador_disponibilidades_visitadorId_fkey" FOREIGN KEY ("visitadorId") REFERENCES "visitadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitador_disponibilidades" ADD CONSTRAINT "visitador_disponibilidades_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_assistidoId_fkey" FOREIGN KEY ("assistidoId") REFERENCES "assistidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_visitadorId_fkey" FOREIGN KEY ("visitadorId") REFERENCES "visitadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_visitadorSecundarioId_fkey" FOREIGN KEY ("visitadorSecundarioId") REFERENCES "visitadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_anexos" ADD CONSTRAINT "visita_anexos_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visitas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programas" ADD CONSTRAINT "programas_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motivos_visita" ADD CONSTRAINT "motivos_visita_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_encaminhamento" ADD CONSTRAINT "tipos_encaminhamento_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prioridades" ADD CONSTRAINT "prioridades_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_customizados" ADD CONSTRAINT "status_customizados_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros_app" ADD CONSTRAINT "parametros_app_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_visita" ADD CONSTRAINT "relatorios_visita_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visitas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_visita" ADD CONSTRAINT "relatorios_visita_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_assistidoId_fkey" FOREIGN KEY ("assistidoId") REFERENCES "assistidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visitas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_plano" ADD CONSTRAINT "acoes_plano_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_acao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamentos_plano" ADD CONSTRAINT "acompanhamentos_plano_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_acao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_visita" ADD CONSTRAINT "solicitacoes_visita_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_visita" ADD CONSTRAINT "solicitacoes_visita_assistidoId_fkey" FOREIGN KEY ("assistidoId") REFERENCES "assistidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_visita" ADD CONSTRAINT "solicitacoes_visita_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_visita" ADD CONSTRAINT "solicitacoes_visita_motivoPrincipalId_fkey" FOREIGN KEY ("motivoPrincipalId") REFERENCES "motivos_visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_visita" ADD CONSTRAINT "solicitacoes_visita_prioridadeId_fkey" FOREIGN KEY ("prioridadeId") REFERENCES "prioridades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_visita" ADD CONSTRAINT "solicitacoes_visita_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visitas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_visita_anexos" ADD CONSTRAINT "solicitacao_visita_anexos_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_visita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_visita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_prioridadeReclassificadaId_fkey" FOREIGN KEY ("prioridadeReclassificadaId") REFERENCES "prioridades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triagens" ADD CONSTRAINT "triagens_setorEncaminhamentoId_fkey" FOREIGN KEY ("setorEncaminhamentoId") REFERENCES "tipos_encaminhamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization_tenants"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_assistidoId_fkey" FOREIGN KEY ("assistidoId") REFERENCES "assistidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visitas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios_visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_planoAcaoId_fkey" FOREIGN KEY ("planoAcaoId") REFERENCES "planos_acao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitacaoMotivosSecundarios" ADD CONSTRAINT "_SolicitacaoMotivosSecundarios_A_fkey" FOREIGN KEY ("A") REFERENCES "motivos_visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SolicitacaoMotivosSecundarios" ADD CONSTRAINT "_SolicitacaoMotivosSecundarios_B_fkey" FOREIGN KEY ("B") REFERENCES "solicitacoes_visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
