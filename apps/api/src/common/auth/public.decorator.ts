import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública (sem JWT da Central).
 * Usado por health-check e webhooks (que têm guard próprio).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
