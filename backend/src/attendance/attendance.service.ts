import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSource, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AttendancePoliciesService } from './attendance-policies.service';
import { ShiftsService } from './shifts.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CheckInDto, CheckOutDto, UpsertAttendanceDto } from './dto/check-in.dto';

function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: AttendancePoliciesService,
    private readonly shifts: ShiftsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async checkIn(user: AuthenticatedUser, dto: CheckInDto, meta: { ipAddress?: string; userAgent?: string }) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new BadRequestException('No employee record linked to this account');
    const today = startOfDay();

    const existing = await this.prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
    if (existing?.checkInAt && !existing.checkOutAt) {
      throw new BadRequestException('Already checked in today');
    }
    if (existing?.checkOutAt) {
      throw new BadRequestException('Attendance for today is already completed');
    }

    const shift = await this.shifts.currentShift(employeeId);
    const now = new Date();
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (shift) {
      const [h, m] = shift.startTime.split(':').map(Number);
      const shiftStart = new Date(today);
      shiftStart.setHours(h, m, 0, 0);
      const lateThreshold = new Date(shiftStart.getTime() + shift.gracePeriodMinutes * 60000);
      if (now > lateThreshold) status = AttendanceStatus.LATE;
    }

    const record = existing
      ? await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { checkInAt: now, status, source: dto.source ?? AttendanceSource.WEB_PORTAL, latitude: dto.latitude, longitude: dto.longitude, notes: dto.notes, ipAddress: meta.ipAddress, deviceInfo: meta.userAgent },
        })
      : await this.prisma.attendanceRecord.create({
          data: {
            organizationId: user.organizationId,
            employeeId,
            date: today,
            checkInAt: now,
            status,
            source: dto.source ?? AttendanceSource.WEB_PORTAL,
            latitude: dto.latitude,
            longitude: dto.longitude,
            notes: dto.notes,
            ipAddress: meta.ipAddress,
            deviceInfo: meta.userAgent,
          },
        });

    return record;
  }

  async checkOut(user: AuthenticatedUser, dto: CheckOutDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new BadRequestException('No employee record linked to this account');
    const today = startOfDay();

    const record = await this.prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
    if (!record?.checkInAt) throw new BadRequestException('You have not checked in today');
    if (record.checkOutAt) throw new BadRequestException('Already checked out today');

    await this.endOpenBreaks(record.id);
    const now = new Date();
    const breakMinutes = await this.totalBreakMinutes(record.id);
    const workingMinutes = Math.max(0, Math.round((now.getTime() - record.checkInAt.getTime()) / 60000) - breakMinutes);

    const policy = await this.policies.default(user.organizationId);
    const halfDayMinutes = Number(policy?.halfDayHours ?? 4) * 60;
    const minimumMinutes = Number(policy?.minimumWorkingHours ?? 8) * 60;

    let status = record.status;
    if (status !== AttendanceStatus.LATE) {
      if (workingMinutes < halfDayMinutes) status = AttendanceStatus.HALF_DAY;
      else if (workingMinutes < minimumMinutes) status = AttendanceStatus.EARLY_DEPARTURE;
      else status = AttendanceStatus.PRESENT;
    }

    const overtimeMinutes = policy?.overtimeEnabled && workingMinutes > minimumMinutes ? workingMinutes - minimumMinutes : 0;

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOutAt: now, workingMinutes, breakMinutes, overtimeMinutes, status, notes: dto.notes ?? record.notes },
    });
  }

  async startBreak(user: AuthenticatedUser) {
    const record = await this.todayRecord(user);
    const open = await this.prisma.attendanceBreak.findFirst({ where: { attendanceRecordId: record.id, endAt: null } });
    if (open) throw new BadRequestException('A break is already in progress');
    return this.prisma.attendanceBreak.create({ data: { attendanceRecordId: record.id, startAt: new Date() } });
  }

  async endBreak(user: AuthenticatedUser) {
    const record = await this.todayRecord(user);
    const open = await this.prisma.attendanceBreak.findFirst({ where: { attendanceRecordId: record.id, endAt: null } });
    if (!open) throw new BadRequestException('No break in progress');
    return this.prisma.attendanceBreak.update({ where: { id: open.id }, data: { endAt: new Date() } });
  }

  async todayStatus(user: AuthenticatedUser) {
    if (!user.employeeId) throw new BadRequestException('No employee record linked to this account');
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: user.employeeId, date: startOfDay() } },
      include: { breaks: true },
    });
    const openBreak = record?.breaks.find((b) => !b.endAt) ?? null;
    return { record, onBreak: !!openBreak };
  }

  async history(user: AuthenticatedUser, filters: { employeeId?: string; from?: string; to?: string }) {
    const where: any = { organizationId: user.organizationId };
    const canViewAll = user.roleKey === 'SUPER_ADMIN' || user.permissions.includes('attendance:VIEW_ALL') || user.permissions.includes('attendance:VIEW');
    if (filters.employeeId && canViewAll) {
      where.employeeId = filters.employeeId;
    } else if (user.permissions.includes('attendance:VIEW_SUBORDINATE') && user.employeeId) {
      where.employee = { reportingManagerId: user.employeeId };
    } else if (user.permissions.includes('attendance:VIEW_DEPARTMENT') && user.employeeId) {
      const self = await this.prisma.employee.findUnique({ where: { id: user.employeeId } });
      where.employee = { departmentId: self?.departmentId ?? '__none__' };
    } else if (canViewAll) {
      // no extra scoping - all employees in org
    } else if (user.employeeId) {
      where.employeeId = user.employeeId;
    } else {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    if (filters.from || filters.to) {
      where.date = { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lte: new Date(filters.to) } : {}) };
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } }, breaks: true },
      orderBy: { date: 'desc' },
    });
  }

  async adminUpsert(user: AuthenticatedUser, dto: UpsertAttendanceDto) {
    const date = startOfDay(new Date(dto.date));
    const existing = await this.prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: dto.employeeId, date } } });
    if (existing?.locked) throw new BadRequestException('This attendance record is locked');

    const checkInAt = dto.checkInAt ? new Date(dto.checkInAt) : existing?.checkInAt ?? null;
    const checkOutAt = dto.checkOutAt ? new Date(dto.checkOutAt) : existing?.checkOutAt ?? null;
    const workingMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)) : existing?.workingMinutes ?? null;

    const data = {
      organizationId: user.organizationId,
      employeeId: dto.employeeId,
      date,
      checkInAt,
      checkOutAt,
      workingMinutes,
      status: (dto.status as AttendanceStatus) ?? existing?.status ?? AttendanceStatus.PRESENT,
      source: AttendanceSource.MANUAL_ENTRY,
      notes: dto.notes ?? existing?.notes,
    };

    const record = existing
      ? await this.prisma.attendanceRecord.update({ where: { id: existing.id }, data })
      : await this.prisma.attendanceRecord.create({ data });

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.userId,
      action: existing ? 'EDIT_ATTENDANCE' : 'ADD_ATTENDANCE',
      module: 'attendance',
      recordId: record.id,
      previousValue: existing,
      newValue: record,
    });

    return record;
  }

  async lock(user: AuthenticatedUser, id: string, locked: boolean) {
    const record = await this.prisma.attendanceRecord.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!record) throw new NotFoundException('Attendance record not found');
    const updated = await this.prisma.attendanceRecord.update({ where: { id }, data: { locked } });
    await this.auditLogs.record({ organizationId: user.organizationId, userId: user.userId, action: locked ? 'LOCK_ATTENDANCE' : 'UNLOCK_ATTENDANCE', module: 'attendance', recordId: id });
    return updated;
  }

  async anomalies(organizationId: string, date?: string) {
    const day = startOfDay(date ? new Date(date) : new Date());
    const [lateArrivals, missingCheckouts] = await Promise.all([
      this.prisma.attendanceRecord.findMany({ where: { organizationId, date: day, status: AttendanceStatus.LATE }, include: { employee: true } }),
      this.prisma.attendanceRecord.findMany({ where: { organizationId, date: day, checkInAt: { not: null }, checkOutAt: null }, include: { employee: true } }),
    ]);
    return { lateArrivals, missingCheckouts };
  }

  private async todayRecord(user: AuthenticatedUser) {
    if (!user.employeeId) throw new BadRequestException('No employee record linked to this account');
    const record = await this.prisma.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: user.employeeId, date: startOfDay() } } });
    if (!record?.checkInAt) throw new BadRequestException('You have not checked in today');
    return record;
  }

  private async endOpenBreaks(attendanceRecordId: string) {
    await this.prisma.attendanceBreak.updateMany({ where: { attendanceRecordId, endAt: null }, data: { endAt: new Date() } });
  }

  private async totalBreakMinutes(attendanceRecordId: string): Promise<number> {
    const breaks = await this.prisma.attendanceBreak.findMany({ where: { attendanceRecordId } });
    return breaks.reduce((sum, b) => sum + (b.endAt ? Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000) : 0), 0);
  }
}
