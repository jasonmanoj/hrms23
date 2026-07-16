import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  roleId: string | null;
  roleKey: string | null;
  employeeId: string | null;
  permissions: string[];
}

export const CurrentUser = createParamDecorator((data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user: AuthenticatedUser = request.user;
  return data ? user?.[data] : user;
});
