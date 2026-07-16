import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private canAccessEmployee(user: AuthenticatedUser, employeeId: string) {
    if (user.roleKey === 'SUPER_ADMIN') return true;
    if (user.permissions.includes('documents:VIEW') || user.permissions.includes('documents:CREATE')) return true;
    if (user.employeeId === employeeId) return true;
    return false;
  }

  async upload(
    user: AuthenticatedUser,
    employeeId: string,
    type: DocumentType,
    name: string,
    fileUrl: string,
    expiryDate?: string,
  ) {
    if (!this.canAccessEmployee(user, employeeId)) throw new ForbiddenException();
    const document = await this.prisma.employeeDocument.create({
      data: {
        organizationId: user.organizationId,
        employeeId,
        type,
        name,
        fileUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedById: user.userId,
      },
    });
    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'UPLOAD_DOCUMENT',
      module: 'documents',
      recordId: document.id,
      newValue: { employeeId, type, name },
    });
    return document;
  }

  async listForEmployee(user: AuthenticatedUser, employeeId: string) {
    if (!this.canAccessEmployee(user, employeeId)) throw new ForbiddenException();
    return this.prisma.employeeDocument.findMany({ where: { organizationId: user.organizationId, employeeId }, orderBy: { createdAt: 'desc' } });
  }

  async get(user: AuthenticatedUser, id: string) {
    const document = await this.prisma.employeeDocument.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!document) throw new NotFoundException('Document not found');
    if (!this.canAccessEmployee(user, document.employeeId)) throw new ForbiddenException();
    return document;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const document = await this.get(user, id);
    await this.prisma.employeeDocument.delete({ where: { id: document.id } });
    await this.auditLogs.record({ organizationId: user.organizationId, userId: user.userId, action: 'DELETE_DOCUMENT', module: 'documents', recordId: id });
    return { success: true };
  }
}
