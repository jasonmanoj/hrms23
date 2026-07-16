import { Injectable } from '@nestjs/common';
import { LeaveTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class LeaveBalancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async ensureBalance(employeeId: string, leaveTypeId: string, year: number, openingIfNew = 0) {
    const existing = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    });
    if (existing) return existing;
    const balance = await this.prisma.leaveBalance.create({
      data: { employeeId, leaveTypeId, year, opening: openingIfNew },
    });
    if (openingIfNew > 0) {
      await this.prisma.leaveTransaction.create({
        data: { leaveBalanceId: balance.id, type: LeaveTransactionType.OPENING, amount: openingIfNew, note: 'Policy assignment entitlement' },
      });
    }
    return balance;
  }

  async forEmployee(employeeId: string, year = new Date().getFullYear()) {
    return this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }

  async available(employeeId: string, leaveTypeId: string, year: number) {
    const balance = await this.ensureBalance(employeeId, leaveTypeId, year);
    return (
      Number(balance.opening) +
      Number(balance.accrued) +
      Number(balance.carriedForward) +
      Number(balance.adjusted) -
      Number(balance.used) -
      Number(balance.pending) -
      Number(balance.expired)
    );
  }

  async adjust(organizationId: string, actorUserId: string, employeeId: string, leaveTypeId: string, amount: number, note: string) {
    const year = new Date().getFullYear();
    const balance = await this.ensureBalance(employeeId, leaveTypeId, year);
    const updated = await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { adjusted: { increment: amount } },
    });
    await this.prisma.leaveTransaction.create({
      data: { leaveBalanceId: balance.id, type: LeaveTransactionType.ADJUSTMENT, amount, note, createdById: actorUserId },
    });
    await this.auditLogs.record({
      organizationId,
      userId: actorUserId,
      action: 'ADJUST_LEAVE_BALANCE',
      module: 'leave-balances',
      recordId: balance.id,
      previousValue: { adjusted: balance.adjusted },
      newValue: { adjusted: updated.adjusted, amount, note },
    });
    return updated;
  }

  // Runs monthly/yearly accrual for every employee with an assigned leave policy.
  // Triggered by the ScheduleModule cron (monthly) and available as a manual admin action.
  async runAccrual(organizationId: string) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const assignments = await this.prisma.employeeLeavePolicy.findMany({
      where: { leavePolicy: { organizationId } },
      include: { employee: true, leavePolicy: { include: { rules: { include: { leaveType: true } } } } },
    });

    let processed = 0;
    for (const assignment of assignments) {
      for (const rule of assignment.leavePolicy.rules) {
        if (!rule.leaveType.active) continue;
        const entitlement = Number(rule.annualEntitlementOverride ?? rule.leaveType.annualEntitlement);
        if (entitlement <= 0) continue;
        const accrualAmount = rule.leaveType.accrualFrequency === 'MONTHLY' ? entitlement / 12 : month === 1 ? entitlement : 0;
        if (accrualAmount <= 0) continue;

        const balance = await this.ensureBalance(assignment.employeeId, rule.leaveTypeId, year);
        await this.prisma.leaveBalance.update({ where: { id: balance.id }, data: { accrued: { increment: accrualAmount } } });
        await this.prisma.leaveTransaction.create({
          data: { leaveBalanceId: balance.id, type: LeaveTransactionType.ACCRUAL, amount: accrualAmount, note: `Accrual for ${year}-${month}` },
        });
        processed++;
      }
    }
    return { processed };
  }
}
