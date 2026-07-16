import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSource, AttendanceStatus, RegularizationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequestRegularizationDto } from './dto/regularization.dto';

@Injectable()
export class RegularizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  async request(user: AuthenticatedUser, dto: RequestRegularizationDto) {
    if (!user.employeeId) throw new BadRequestException('No employee record linked to this account');
    const regularization = await this.prisma.attendanceRegularization.create({
      data: {
        organizationId: user.organizationId,
        employeeId: user.employeeId,
        date: new Date(dto.date),
        type: dto.type,
        requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
        requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : null,
        reason: dto.reason,
      },
    });

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'REQUEST_REGULARIZATION',
      module: 'regularizations',
      recordId: regularization.id,
      newValue: { date: dto.date, type: dto.type },
    });

    const employee = await this.prisma.employee.findUnique({ where: { id: user.employeeId } });
    if (employee?.reportingManagerId) {
      const managerUser = await this.prisma.user.findUnique({ where: { employeeId: employee.reportingManagerId } });
      if (managerUser) {
        await this.notifications.notify({
          organizationId: user.organizationId,
          userId: managerUser.id,
          type: 'APPROVAL_PENDING',
          title: 'Attendance regularization pending',
          message: `${employee.firstName} ${employee.lastName} requested attendance regularization for ${dto.date}.`,
          email: managerUser.email,
        });
      }
    }

    return regularization;
  }

  async list(user: AuthenticatedUser, filters: { status?: RegularizationStatus; employeeId?: string }) {
    const where: any = { organizationId: user.organizationId };
    const canViewAll = user.roleKey === 'SUPER_ADMIN' || user.permissions.includes('regularizations:VIEW_ALL') || user.permissions.includes('regularizations:VIEW');
    if (canViewAll) {
      if (filters.employeeId) where.employeeId = filters.employeeId;
    } else if (user.permissions.includes('regularizations:VIEW_SUBORDINATE') && user.employeeId) {
      where.employee = { reportingManagerId: user.employeeId };
    } else if (user.permissions.includes('regularizations:VIEW_DEPARTMENT') && user.employeeId) {
      const self = await this.prisma.employee.findUnique({ where: { id: user.employeeId } });
      where.employee = { departmentId: self?.departmentId ?? '__none__' };
    } else if (user.employeeId) {
      where.employeeId = user.employeeId;
    } else {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
    if (filters.status) where.status = filters.status;

    return this.prisma.attendanceRegularization.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, reportingManagerId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(user: AuthenticatedUser, id: string, approve: boolean, comments?: string) {
    const regularization = await this.prisma.attendanceRegularization.findFirst({ where: { id, organizationId: user.organizationId }, include: { employee: true } });
    if (!regularization) throw new NotFoundException('Regularization request not found');
    if (regularization.status !== RegularizationStatus.PENDING) throw new BadRequestException('Request already resolved');

    const canApprove =
      user.roleKey === 'SUPER_ADMIN' ||
      user.permissions.includes('regularizations:APPROVE') ||
      user.employeeId === regularization.employee.reportingManagerId;
    if (!canApprove) throw new ForbiddenException('Not authorized to resolve this request');

    const status = approve ? RegularizationStatus.APPROVED : RegularizationStatus.REJECTED;
    const updated = await this.prisma.attendanceRegularization.update({
      where: { id },
      data: { status, approverUserId: user.userId, approverComments: comments },
    });

    if (approve) {
      const date = new Date(regularization.date);
      date.setHours(0, 0, 0, 0);
      const existing = await this.prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: regularization.employeeId, date } } });
      const checkInAt = regularization.requestedCheckIn ?? existing?.checkInAt ?? null;
      const checkOutAt = regularization.requestedCheckOut ?? existing?.checkOutAt ?? null;
      const workingMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)) : existing?.workingMinutes ?? null;
      const status2 = regularization.type === 'WORK_FROM_HOME' ? AttendanceStatus.WORK_FROM_HOME : regularization.type === 'ON_DUTY' ? AttendanceStatus.ON_DUTY : AttendanceStatus.PRESENT;

      const data = {
        organizationId: user.organizationId,
        employeeId: regularization.employeeId,
        date,
        checkInAt,
        checkOutAt,
        workingMinutes,
        status: status2,
        source: AttendanceSource.MANUAL_ENTRY,
        notes: `Regularized: ${regularization.reason}`,
      };
      if (existing) await this.prisma.attendanceRecord.update({ where: { id: existing.id }, data });
      else await this.prisma.attendanceRecord.create({ data });
    }

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: approve ? 'APPROVE_REGULARIZATION' : 'REJECT_REGULARIZATION',
      module: 'regularizations',
      recordId: id,
    });

    const employeeUser = await this.prisma.user.findUnique({ where: { employeeId: regularization.employeeId } });
    if (employeeUser) {
      await this.notifications.notify({
        organizationId: user.organizationId,
        userId: employeeUser.id,
        type: approve ? 'REGULARIZATION_APPROVED' : 'REGULARIZATION_REJECTED',
        title: `Attendance regularization ${approve ? 'approved' : 'rejected'}`,
        message: `Your regularization request for ${regularization.date.toISOString().slice(0, 10)} was ${approve ? 'approved' : 'rejected'}.`,
        email: employeeUser.email,
      });
    }

    return updated;
  }
}
