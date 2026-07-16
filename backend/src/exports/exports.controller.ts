import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { PermissionAction } from '@prisma/client';
import { ExportsService } from './exports.service';
import { ReportFilters, ReportKey } from '../reports/report-definitions';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

const EXPORT_ROOT = process.env.UPLOAD_DIR ? join(process.env.UPLOAD_DIR, 'exports') : './uploads/exports';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get()
  @RequirePermissions('exports', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.exports.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('exports', PermissionAction.EXPORT)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: { reportKey: ReportKey; format?: 'XLSX' | 'CSV'; filters?: ReportFilters }) {
    return this.exports.enqueue(user.organizationId, user.userId, dto.reportKey, dto.format ?? 'XLSX', dto.filters ?? {});
  }

  @Get(':id/download')
  @RequirePermissions('exports', PermissionAction.VIEW)
  async download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Res() res: Response) {
    const job = await this.exports.get(user.organizationId, id);
    if (!job || job.status !== 'COMPLETED' || !job.fileUrl) {
      return res.status(404).json({ message: 'Export not ready' });
    }
    return res.sendFile(job.fileUrl, { root: EXPORT_ROOT });
  }
}
