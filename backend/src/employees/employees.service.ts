import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertEmployeeDto } from './dto/upsert-employee.dto';

const SENSITIVE_FIELDS = [
  'bankName',
  'accountHolderName',
  'accountNumber',
  'iban',
  'swiftCode',
  'salaryCurrency',
  'basicSalary',
  'allowances',
  'deductions',
] as const;

function stripSensitive<T extends Record<string, any>>(record: T): T {
  const copy = { ...record };
  for (const field of SENSITIVE_FIELDS) delete copy[field];
  return copy;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private canViewSensitive(user: AuthenticatedUser) {
    return user.roleKey === 'SUPER_ADMIN' || user.permissions.includes('employee-sensitive-fields:VIEW');
  }

  private canEditSensitive(user: AuthenticatedUser) {
    return user.roleKey === 'SUPER_ADMIN' || user.permissions.includes('employee-sensitive-fields:EDIT');
  }

  // Applies role-based record-visibility scoping (own / subordinate / department / all)
  // on top of the base VIEW permission already checked by the PermissionsGuard.
  private async buildScopeWhere(user: AuthenticatedUser) {
    if (user.roleKey === 'SUPER_ADMIN' || user.permissions.includes('employees:VIEW_ALL') || user.permissions.includes('employees:VIEW')) {
      return { organizationId: user.organizationId };
    }
    if (user.permissions.includes('employees:VIEW_DEPARTMENT') && user.employeeId) {
      const self = await this.prisma.employee.findUnique({ where: { id: user.employeeId } });
      return { organizationId: user.organizationId, departmentId: self?.departmentId ?? '__none__' };
    }
    if (user.permissions.includes('employees:VIEW_SUBORDINATE') && user.employeeId) {
      return { organizationId: user.organizationId, reportingManagerId: user.employeeId };
    }
    if (user.permissions.includes('employees:VIEW_OWN') && user.employeeId) {
      return { organizationId: user.organizationId, id: user.employeeId };
    }
    throw new ForbiddenException('Insufficient permissions for this action');
  }

  async list(user: AuthenticatedUser, filters: { departmentId?: string; status?: EmployeeStatus; search?: string }) {
    const where: any = await this.buildScopeWhere(user);
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: { department: true, designation: true, location: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.canViewSensitive(user) ? employees : employees.map(stripSensitive);
  }

  async get(user: AuthenticatedUser, id: string) {
    const scope = await this.buildScopeWhere(user);
    const employee = await this.prisma.employee.findFirst({
      where: { ...scope, id },
      include: { department: true, designation: true, location: true, reportingManager: true, documents: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.canViewSensitive(user) ? employee : stripSensitive(employee);
  }

  async create(user: AuthenticatedUser, dto: UpsertEmployeeDto) {
    const data = this.canEditSensitive(user) ? dto : stripSensitive(dto as any);
    const employeeNumber = dto.employeeNumber ?? (await this.nextEmployeeNumber(user.organizationId));

    const employee = await this.prisma.employee.create({
      data: {
        organizationId: user.organizationId,
        ...data,
        employeeNumber,
        status: EmployeeStatus.DRAFT,
      } as any,
    });

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'CREATE_EMPLOYEE',
      module: 'employees',
      recordId: employee.id,
      newValue: { employeeNumber: employee.employeeNumber, name: `${employee.firstName} ${employee.lastName}` },
    });

    return employee;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertEmployeeDto) {
    const before = await this.get(user, id);
    const data = this.canEditSensitive(user) ? dto : stripSensitive(dto as any);

    const employee = await this.prisma.employee.update({ where: { id }, data: data as any });

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'UPDATE_EMPLOYEE',
      module: 'employees',
      recordId: id,
      previousValue: stripSensitive(before as any),
      newValue: stripSensitive(employee as any),
    });

    return employee;
  }

  async changeStatus(user: AuthenticatedUser, id: string, status: EmployeeStatus, reason?: string) {
    await this.get(user, id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { status, ...(status === EmployeeStatus.RESIGNED || status === EmployeeStatus.TERMINATED ? { lastWorkingDate: new Date() } : {}) },
    });
    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: `EMPLOYEE_STATUS_${status}`,
      module: 'employees',
      recordId: id,
      newValue: { status, reason },
    });
    return employee;
  }

  async upcomingDocumentExpiries(organizationId: string, withinDays = 30) {
    const to = new Date(Date.now() + withinDays * 86400000);
    return this.prisma.employeeDocument.findMany({
      where: { organizationId, expiryDate: { not: null, lte: to, gte: new Date() } },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  private async nextEmployeeNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.employee.count({ where: { organizationId } });
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }
}
