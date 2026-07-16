import { Controller, Get, Param, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { ReportsService } from './reports.service';
import { REPORT_KEYS, ReportKey } from './report-definitions';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @RequirePermissions('reports', PermissionAction.VIEW)
  listAvailable() {
    return REPORT_KEYS;
  }

  @Get(':key')
  @RequirePermissions('reports', PermissionAction.VIEW)
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: ReportKey,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    return this.reports.generate(user.organizationId, key, { from, to, departmentId, employeeId, status, leaveTypeId });
  }
}
