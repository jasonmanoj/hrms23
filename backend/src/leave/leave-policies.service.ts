import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLeavePolicyDto } from './dto/upsert-leave-policy.dto';
import { LeaveBalancesService } from './leave-balances.service';

@Injectable()
export class LeavePoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalances: LeaveBalancesService,
  ) {}

  list(organizationId: string) {
    return this.prisma.leavePolicy.findMany({
      where: { organizationId },
      include: { rules: { include: { leaveType: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async get(organizationId: string, id: string) {
    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id, organizationId },
      include: { rules: { include: { leaveType: true } } },
    });
    if (!policy) throw new NotFoundException('Leave policy not found');
    return policy;
  }

  create(organizationId: string, dto: UpsertLeavePolicyDto) {
    return this.prisma.leavePolicy.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        rules: { create: dto.rules.map((r) => ({ leaveTypeId: r.leaveTypeId, annualEntitlementOverride: r.annualEntitlementOverride })) },
      },
      include: { rules: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpsertLeavePolicyDto) {
    await this.get(organizationId, id);
    await this.prisma.leavePolicyRule.deleteMany({ where: { leavePolicyId: id } });
    return this.prisma.leavePolicy.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        rules: { create: dto.rules.map((r) => ({ leaveTypeId: r.leaveTypeId, annualEntitlementOverride: r.annualEntitlementOverride })) },
      },
      include: { rules: true },
    });
  }

  async assign(organizationId: string, employeeId: string, leavePolicyId: string) {
    const policy = await this.get(organizationId, leavePolicyId);
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, organizationId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const assignment = await this.prisma.employeeLeavePolicy.upsert({
      where: { employeeId_leavePolicyId: { employeeId, leavePolicyId } },
      create: { employeeId, leavePolicyId },
      update: {},
    });

    const year = new Date().getFullYear();
    for (const rule of policy.rules) {
      const entitlement = rule.annualEntitlementOverride ?? rule.leaveType.annualEntitlement;
      await this.leaveBalances.ensureBalance(employeeId, rule.leaveTypeId, year, Number(entitlement));
    }

    return assignment;
  }

  async assignmentsForEmployee(organizationId: string, employeeId: string) {
    return this.prisma.employeeLeavePolicy.findMany({
      where: { employeeId, leavePolicy: { organizationId } },
      include: { leavePolicy: { include: { rules: { include: { leaveType: true } } } } },
    });
  }
}
