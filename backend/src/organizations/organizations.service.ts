import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async get(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(organizationId: string, actorUserId: string, dto: UpdateOrganizationDto) {
    const before = await this.get(organizationId);
    const updated = await this.prisma.organization.update({ where: { id: organizationId }, data: dto });
    await this.auditLogs.record({
      organizationId,
      userId: actorUserId,
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      module: 'organizations',
      recordId: organizationId,
      previousValue: before,
      newValue: updated,
    });
    return updated;
  }
}
