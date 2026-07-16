import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit-logs', PermissionAction.VIEW)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditLogs.list(
      user.organizationId,
      { module, userId, from, to },
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 25,
    );
  }
}
