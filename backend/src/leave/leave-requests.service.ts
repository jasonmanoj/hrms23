import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalActionType, LeaveDayType, LeaveRequestStatus, LeaveTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeaveBalancesService } from './leave-balances.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ApplyLeaveDto } from './dto/apply-leave.dto';

function daysBetweenExclWeekends(from: Date, to: Date, holidayDates: Set<string>): number {
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    const day = cursor.getDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayDates.has(iso)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: LeaveBalancesService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  private async computeTotalDays(organizationId: string, dto: ApplyLeaveDto): Promise<number> {
    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);
    if (to < from) throw new BadRequestException('toDate cannot be before fromDate');

    if (dto.dayType === LeaveDayType.HALF_DAY) return 0.5;
    if (dto.dayType === LeaveDayType.HOURLY) return Math.round(((dto.hours ?? 0) / 8) * 100) / 100;

    const holidays = await this.prisma.holiday.findMany({ where: { organizationId, date: { gte: from, lte: to } } });
    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
    return daysBetweenExclWeekends(from, to, holidayDates);
  }

  async apply(user: AuthenticatedUser, dto: ApplyLeaveDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: user.employeeId!, organizationId: user.organizationId } });
    if (!employee) throw new NotFoundException('Employee record not found for current user');

    const leaveType = await this.prisma.leaveType.findFirst({ where: { id: dto.leaveTypeId, organizationId: user.organizationId } });
    if (!leaveType || !leaveType.active) throw new BadRequestException('Invalid leave type');
    if (leaveType.applicableGender && leaveType.applicableGender !== employee.gender) {
      throw new BadRequestException('This leave type is not applicable to your profile');
    }
    if (employee.dateOfJoining && leaveType.minServiceDays > 0) {
      const serviceDays = Math.floor((Date.now() - employee.dateOfJoining.getTime()) / 86400000);
      if (serviceDays < leaveType.minServiceDays) {
        throw new BadRequestException(`Minimum service period of ${leaveType.minServiceDays} days not met`);
      }
    }
    if (dto.dayType === LeaveDayType.HALF_DAY && !leaveType.allowHalfDay) throw new BadRequestException('Half-day not allowed for this leave type');
    if (dto.dayType === LeaveDayType.HOURLY && !leaveType.allowHourly) throw new BadRequestException('Hourly leave not allowed for this leave type');

    const totalDays = await this.computeTotalDays(user.organizationId, dto);
    if (totalDays <= 0) throw new BadRequestException('Selected range has no working days');
    if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
      throw new BadRequestException(`Exceeds maximum consecutive days of ${leaveType.maxConsecutiveDays}`);
    }

    const year = new Date(dto.fromDate).getFullYear();
    if (!leaveType.allowNegativeBalance) {
      const available = await this.balances.available(employee.id, leaveType.id, year);
      if (available < totalDays) {
        throw new BadRequestException(`Insufficient leave balance. Available: ${available}, requested: ${totalDays}`);
      }
    }

    const steps: { stepOrder: number; approverRole: string }[] = [];
    let order = 1;
    if (employee.reportingManagerId) steps.push({ stepOrder: order++, approverRole: 'REPORTING_MANAGER' });
    steps.push({ stepOrder: order++, approverRole: 'HR_ADMIN' });

    const request = await this.prisma.leaveRequest.create({
      data: {
        organizationId: user.organizationId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        fromDate: new Date(dto.fromDate),
        toDate: new Date(dto.toDate),
        dayType: dto.dayType ?? LeaveDayType.FULL_DAY,
        hours: dto.hours,
        totalDays,
        reason: dto.reason,
        substituteId: dto.substituteId,
        approvalSteps: { create: steps },
        documents: dto.documentUrls ? { create: dto.documentUrls.map((url) => ({ fileUrl: url, name: url.split('/').pop() ?? 'document' })) } : undefined,
      },
      include: { approvalSteps: true, leaveType: true },
    });

    const balance = await this.balances.ensureBalance(employee.id, leaveType.id, year);
    await this.prisma.leaveBalance.update({ where: { id: balance.id }, data: { pending: { increment: totalDays } } });

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'APPLY_LEAVE',
      module: 'leave-requests',
      recordId: request.id,
      newValue: { leaveType: leaveType.name, totalDays, fromDate: dto.fromDate, toDate: dto.toDate },
    });

    await this.notifyNextApprover(request.id);

    return request;
  }

  async list(
    user: AuthenticatedUser,
    filters: { status?: LeaveRequestStatus; employeeId?: string; leaveTypeId?: string; from?: string; to?: string },
  ) {
    const where: any = { organizationId: user.organizationId };
    const canViewAll = user.roleKey === 'SUPER_ADMIN' || user.permissions.includes('leave-requests:VIEW_ALL');
    const canViewDept = user.permissions.includes('leave-requests:VIEW_DEPARTMENT');
    const canViewSub = user.permissions.includes('leave-requests:VIEW_SUBORDINATE');
    const ownOnly = user.permissions.includes('leave-requests:VIEW_OWN') && !canViewAll && !canViewDept && !canViewSub;

    if (canViewAll) {
      // no extra scoping
    } else if (canViewDept && user.employeeId) {
      const self = await this.prisma.employee.findUnique({ where: { id: user.employeeId } });
      where.employee = { departmentId: self?.departmentId ?? '__none__' };
    } else if (canViewSub && user.employeeId) {
      where.employee = { reportingManagerId: user.employeeId };
    } else if (ownOnly && user.employeeId) {
      where.employeeId = user.employeeId;
    } else {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    if (filters.status) where.status = filters.status;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;
    if (filters.from || filters.to) {
      where.fromDate = { ...(filters.to ? { lte: new Date(filters.to) } : {}) };
      where.toDate = { ...(filters.from ? { gte: new Date(filters.from) } : {}) };
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, departmentId: true } }, leaveType: true, approvalSteps: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthenticatedUser, id: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { employee: true, leaveType: true, approvalSteps: true, documents: true },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    return request;
  }

  private canActOnStep(user: AuthenticatedUser, employeeReportingManagerId: string | null, approverRole: string): boolean {
    if (user.roleKey === 'SUPER_ADMIN') return true;
    if (approverRole === 'REPORTING_MANAGER') return user.employeeId != null && user.employeeId === employeeReportingManagerId;
    if (approverRole === 'HR_ADMIN') return user.permissions.includes('leave-requests:APPROVE');
    return false;
  }

  async act(user: AuthenticatedUser, id: string, action: 'APPROVE' | 'REJECT' | 'RETURN', comments?: string) {
    const request = await this.get(user, id);
    if (request.status !== LeaveRequestStatus.PENDING) throw new BadRequestException('Leave request is not pending approval');

    const currentStep = request.approvalSteps.find((s) => s.stepOrder === request.currentStepOrder);
    if (!currentStep) throw new BadRequestException('No pending approval step found');
    if (!this.canActOnStep(user, request.employee.reportingManagerId, currentStep.approverRole)) {
      throw new ForbiddenException('You are not authorized to act on this approval step');
    }

    const actionType = { APPROVE: ApprovalActionType.APPROVED, REJECT: ApprovalActionType.REJECTED, RETURN: ApprovalActionType.RETURNED }[action];
    await this.prisma.leaveApprovalStep.update({
      where: { id: currentStep.id },
      data: { action: actionType, comments, actedAt: new Date(), approverUserId: user.userId },
    });

    const year = request.fromDate.getFullYear();
    const balance = await this.balances.ensureBalance(request.employeeId, request.leaveTypeId, year);

    if (action === 'REJECT' || action === 'RETURN') {
      await this.prisma.leaveBalance.update({ where: { id: balance.id }, data: { pending: { decrement: Number(request.totalDays) } } });
      await this.prisma.leaveRequest.update({ where: { id }, data: { status: action === 'REJECT' ? LeaveRequestStatus.REJECTED : LeaveRequestStatus.RETURNED } });
    } else {
      const nextStep = request.approvalSteps.find((s) => s.stepOrder === currentStep.stepOrder + 1);
      if (nextStep) {
        await this.prisma.leaveRequest.update({ where: { id }, data: { currentStepOrder: nextStep.stepOrder } });
        await this.notifyNextApprover(id);
      } else {
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { pending: { decrement: Number(request.totalDays) }, used: { increment: Number(request.totalDays) } },
        });
        await this.prisma.leaveTransaction.create({
          data: { leaveBalanceId: balance.id, type: LeaveTransactionType.USED, amount: request.totalDays, leaveRequestId: id, note: 'Leave approved' },
        });
        await this.prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.APPROVED } });
      }
    }

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: `LEAVE_${action}`,
      module: 'leave-requests',
      recordId: id,
      newValue: { comments },
    });

    await this.notifyEmployeeOfDecision(request.employeeId, id, action);

    return this.get(user, id);
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const request = await this.get(user, id);
    if (request.employeeId !== user.employeeId && !user.permissions.includes('leave-requests:EDIT') && user.roleKey !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    const year = request.fromDate.getFullYear();
    const balance = await this.balances.ensureBalance(request.employeeId, request.leaveTypeId, year);

    if (request.status === LeaveRequestStatus.PENDING) {
      await this.prisma.leaveBalance.update({ where: { id: balance.id }, data: { pending: { decrement: Number(request.totalDays) } } });
      return this.prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.CANCELLED } });
    }

    if (request.status === LeaveRequestStatus.APPROVED) {
      if (request.fromDate > new Date()) {
        await this.prisma.leaveBalance.update({ where: { id: balance.id }, data: { used: { decrement: Number(request.totalDays) } } });
        await this.prisma.leaveTransaction.create({
          data: { leaveBalanceId: balance.id, type: LeaveTransactionType.CANCELLED, amount: -Number(request.totalDays), leaveRequestId: id, note: 'Leave cancelled before start date' },
        });
        return this.prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.CANCELLED } });
      }
      // Leave has already started: cancellation requires HR approval.
      return this.prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.CANCELLATION_PENDING } });
    }

    throw new BadRequestException('Leave request cannot be cancelled from its current status');
  }

  async resolveCancellation(user: AuthenticatedUser, id: string, approve: boolean) {
    if (!user.permissions.includes('leave-requests:APPROVE') && user.roleKey !== 'SUPER_ADMIN') throw new ForbiddenException();
    const request = await this.get(user, id);
    if (request.status !== LeaveRequestStatus.CANCELLATION_PENDING) throw new BadRequestException('No pending cancellation for this request');

    if (approve) {
      const year = request.fromDate.getFullYear();
      const balance = await this.balances.ensureBalance(request.employeeId, request.leaveTypeId, year);
      await this.prisma.leaveBalance.update({ where: { id: balance.id }, data: { used: { decrement: Number(request.totalDays) } } });
      await this.prisma.leaveTransaction.create({
        data: { leaveBalanceId: balance.id, type: LeaveTransactionType.CANCELLED, amount: -Number(request.totalDays), leaveRequestId: id, note: 'Cancellation approved by HR' },
      });
      return this.prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.CANCELLED } });
    }
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: LeaveRequestStatus.APPROVED } });
  }

  async calendar(organizationId: string, from: string, to: string) {
    const [leaveRequests, holidays] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { organizationId, status: LeaveRequestStatus.APPROVED, fromDate: { lte: new Date(to) }, toDate: { gte: new Date(from) } },
        include: { employee: { select: { id: true, firstName: true, lastName: true, departmentId: true } }, leaveType: { select: { name: true, code: true } } },
      }),
      this.prisma.holiday.findMany({ where: { organizationId, date: { gte: new Date(from), lte: new Date(to) } } }),
    ]);
    return { leaveRequests, holidays };
  }

  private async notifyNextApprover(requestId: string) {
    const request = await this.prisma.leaveRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { employee: true, leaveType: true, approvalSteps: true },
    });
    const step = request.approvalSteps.find((s) => s.stepOrder === request.currentStepOrder);
    if (!step) return;

    if (step.approverRole === 'REPORTING_MANAGER' && request.employee.reportingManagerId) {
      const managerUser = await this.prisma.user.findUnique({ where: { employeeId: request.employee.reportingManagerId } });
      if (managerUser) {
        await this.notifications.notify({
          organizationId: request.organizationId,
          userId: managerUser.id,
          type: 'APPROVAL_PENDING',
          title: 'Leave approval pending',
          message: `${request.employee.firstName} ${request.employee.lastName} applied for ${request.leaveType.name} (${request.totalDays} day(s)).`,
          email: managerUser.email,
        });
      }
    } else if (step.approverRole === 'HR_ADMIN') {
      const hrUsers = await this.prisma.user.findMany({ where: { organizationId: request.organizationId, role: { key: 'HR_ADMIN' } } });
      for (const hrUser of hrUsers) {
        await this.notifications.notify({
          organizationId: request.organizationId,
          userId: hrUser.id,
          type: 'APPROVAL_PENDING',
          title: 'Leave approval pending',
          message: `${request.employee.firstName} ${request.employee.lastName} applied for ${request.leaveType.name} (${request.totalDays} day(s)).`,
          email: hrUser.email,
        });
      }
    }
  }

  private async notifyEmployeeOfDecision(employeeId: string, requestId: string, action: 'APPROVE' | 'REJECT' | 'RETURN') {
    const employeeUser = await this.prisma.user.findUnique({ where: { employeeId } });
    if (!employeeUser) return;
    const request = await this.prisma.leaveRequest.findUniqueOrThrow({ where: { id: requestId }, include: { leaveType: true } });
    const verb = { APPROVE: 'approved', REJECT: 'rejected', RETURN: 'returned for correction' }[action];
    const notificationType = { APPROVE: 'LEAVE_APPROVED', REJECT: 'LEAVE_REJECTED', RETURN: 'LEAVE_RETURNED' }[action];
    await this.notifications.notify({
      organizationId: employeeUser.organizationId,
      userId: employeeUser.id,
      type: notificationType,
      title: `Leave ${verb}`,
      message: `Your ${request.leaveType.name} request has been ${verb}.`,
      email: employeeUser.email,
    });
  }
}
