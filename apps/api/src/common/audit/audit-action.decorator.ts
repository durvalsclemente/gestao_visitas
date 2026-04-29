import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit.action';
export const AUDIT_ENTITY_KEY = 'audit.entity';
export const AUDIT_SKIP_KEY = 'audit.skip';

/**
 * Marca o nome semântico da ação (substitui o default "METHOD /rota").
 * Ex.: @AuditAction('designar-visita').
 */
export const AuditAction = (name: string) => SetMetadata(AUDIT_ACTION_KEY, name);

/** Define o nome lógico da entidade (ex.: "Visita"). */
export const AuditEntity = (name: string) => SetMetadata(AUDIT_ENTITY_KEY, name);

/** Pula auditoria automática (útil em endpoints técnicos como health). */
export const AuditSkip = () => SetMetadata(AUDIT_SKIP_KEY, true);
