import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // SUPER_ADMIN bypasses granular permission checks.
    if (user.roleKey === 'SUPER_ADMIN') {
      return true;
    }

    const granted = new Set(user.permissions ?? []);
    const hasAll = required.every((perm) => granted.has(`${perm.module}:${perm.action}`));
    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
    return true;
  }
}
