import { PrismaClient, RoleKey, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/common/constants/default-role-permissions';

const prisma = new PrismaClient();

async function main() {
  const orgName = 'Demo Organization';
  let organization = await prisma.organization.findFirst({ where: { name: orgName } });
  if (organization) {
    console.log('Demo organization already exists, skipping seed.');
    return;
  }

  organization = await prisma.organization.create({ data: { name: orgName, country: 'United Arab Emirates', currency: 'AED' } });

  const roles: Record<string, { id: string }> = {};
  for (const [key, grants] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.create({
      data: {
        organizationId: organization.id,
        key: key as RoleKey,
        name: key
          .split('_')
          .map((w) => w[0] + w.slice(1).toLowerCase())
          .join(' '),
        isSystem: true,
        permissions: { create: grants.flatMap((g) => Array.from(new Set(g.actions)).map((action) => ({ module: g.module, action }))) },
      },
    });
    roles[key] = { id: role.id };
  }

  const department = await prisma.department.create({ data: { organizationId: organization.id, name: 'Human Resources' } });
  const designation = await prisma.designation.create({ data: { organizationId: organization.id, title: 'HR Manager' } });
  const location = await prisma.location.create({ data: { organizationId: organization.id, name: 'Head Office', timezone: 'Asia/Dubai' } });

  const adminEmployee = await prisma.employee.create({
    data: {
      organizationId: organization.id,
      employeeNumber: 'EMP-0001',
      firstName: 'Admin',
      lastName: 'User',
      personalEmail: 'admin@hrms.local',
      status: 'ACTIVE',
      dateOfJoining: new Date(),
      departmentId: department.id,
      designationId: designation.id,
      locationId: location.id,
    },
  });

  const passwordHash = await argon2.hash('Admin@12345', { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      organizationId: organization.id,
      email: 'admin@hrms.local',
      roleId: roles.SUPER_ADMIN.id,
      employeeId: adminEmployee.id,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  const leaveTypes = await Promise.all([
    prisma.leaveType.create({
      data: { organizationId: organization.id, name: 'Annual Leave', code: 'AL', isPaid: true, annualEntitlement: 21, accrualFrequency: 'MONTHLY', allowHalfDay: true, carryForwardLimit: 5 },
    }),
    prisma.leaveType.create({
      data: { organizationId: organization.id, name: 'Sick Leave', code: 'SL', isPaid: true, annualEntitlement: 10, accrualFrequency: 'YEARLY', allowHalfDay: true, requiresDocumentAboveDays: 2 },
    }),
    prisma.leaveType.create({
      data: { organizationId: organization.id, name: 'Casual Leave', code: 'CL', isPaid: true, annualEntitlement: 7, accrualFrequency: 'YEARLY', allowHalfDay: true },
    }),
    prisma.leaveType.create({
      data: { organizationId: organization.id, name: 'Unpaid Leave', code: 'UL', isPaid: false, annualEntitlement: 0, allowNegativeBalance: true },
    }),
  ]);

  const defaultPolicy = await prisma.leavePolicy.create({
    data: {
      organizationId: organization.id,
      name: 'Standard Policy',
      rules: { create: leaveTypes.map((lt) => ({ leaveTypeId: lt.id })) },
    },
  });

  await prisma.employeeLeavePolicy.create({ data: { employeeId: adminEmployee.id, leavePolicyId: defaultPolicy.id } });
  for (const lt of leaveTypes) {
    await prisma.leaveBalance.create({
      data: { employeeId: adminEmployee.id, leaveTypeId: lt.id, year: new Date().getFullYear(), opening: Number(lt.annualEntitlement) },
    });
  }

  await prisma.attendancePolicy.create({
    data: { organizationId: organization.id, name: 'Standard Policy', isDefault: true, minimumWorkingHours: 8, halfDayHours: 4, gracePeriodMinutes: 10 },
  });

  await prisma.shift.create({
    data: { organizationId: organization.id, name: 'General Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 10, breakMinutes: 60 },
  });

  console.log('Seed complete.');
  console.log(`Login: admin@hrms.local / Admin@12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
