import { SetMetadata } from '@nestjs/common';
import type { CentralRole } from './central-user.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: CentralRole[]) => SetMetadata(ROLES_KEY, roles);
