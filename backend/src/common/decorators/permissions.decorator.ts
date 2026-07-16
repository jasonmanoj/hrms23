import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
}

export const RequirePermissions = (module: string, ...actions: PermissionAction[]) =>
  SetMetadata(PERMISSIONS_KEY, actions.map((action) => ({ module, action })) as RequiredPermission[]);
