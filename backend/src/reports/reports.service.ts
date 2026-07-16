import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilters, ReportKey, ReportResult } from './report-definitions';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, reportKey: ReportKey, filters: ReportFilters): Promise<ReportResult> {
    switch (reportKey) {
      case 'employee-master':
        return this.employeeMaster(organizationId, filters);
      case 'active-employees':
        return this.employeeMaster(organizationId, { ...filters, status: 'ACTIVE' });
      case 'new-joiners':
        return this.newJoiners(organizationId, filters);
      case 'resigned-employees':
        return this.employeeMaster(organizationId, { ...filters, status: 'RESIGNED' });
      case 'employee-document-expiry':
        return this.documentExpiry(organizationId, filters);
      case 'leave-balance':
        return this.leaveBalance(organizationId, filters);
      case 'leave-application':
        return this.leaveApplication(organizationId, filters);
      case 'pending-leave-approvals':
        return this.leaveApplication(organizationId, { ...filters, status: 'PENDING' });
      case 'daily-attendance':
      case 'attendance-summary':
        return this.attendance(organizationId, filters);
      case 'late-arrivals':
        return this.attendance(organizationId, { ...filters, status: 'LATE' });
      case 'missing-checkouts':
        return this.attendance(organizationId, { ...filters, status: 'MISSING_CHECKOUT' });
      case 'overtime':
        return this.overtime(organizationId, filters);
      case 'attendance-regularization':
        return this.regularizations(organizationId, filters);
      default:
        throw new BadRequestException(`Unknown report: ${reportKey}`);
    }
  }

  private async employeeMaster(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      include: { department: true, designation: true, location: true },
      orderBy: { employeeNumber: 'asc' },
    });
    return {
      title: 'Employee Master Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'First Name', key: 'firstName' },
        { header: 'Last Name', key: 'lastName' },
        { header: 'Department', key: 'department' },
        { header: 'Designation', key: 'designation' },
        { header: 'Location', key: 'location' },
        { header: 'Status', key: 'status' },
        { header: 'Date of Joining', key: 'dateOfJoining' },
      ],
      rows: employees.map((e) => ({
        employeeNumber: e.employeeNumber,
        firstName: e.firstName,
        lastName: e.lastName,
        department: e.department?.name ?? '',
        designation: e.designation?.title ?? '',
        location: e.location?.name ?? '',
        status: e.status,
        dateOfJoining: e.dateOfJoining?.toISOString().slice(0, 10) ?? '',
      })),
    };
  }

  private async newJoiners(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const from = filters.from ? new Date(filters.from) : new Date(Date.now() - 30 * 86400000);
    const to = filters.to ? new Date(filters.to) : new Date();
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, dateOfJoining: { gte: from, lte: to } },
      include: { department: true },
      orderBy: { dateOfJoining: 'desc' },
    });
    return {
      title: 'New Joiners Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Name', key: 'name' },
        { header: 'Department', key: 'department' },
        { header: 'Date of Joining', key: 'dateOfJoining' },
      ],
      rows: employees.map((e) => ({
        employeeNumber: e.employeeNumber,
        name: `${e.firstName} ${e.lastName}`,
        department: e.department?.name ?? '',
        dateOfJoining: e.dateOfJoining?.toISOString().slice(0, 10) ?? '',
      })),
    };
  }

  private async documentExpiry(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const to = filters.to ? new Date(filters.to) : new Date(Date.now() + 60 * 86400000);
    const documents = await this.prisma.employeeDocument.findMany({
      where: { organizationId, expiryDate: { not: null, lte: to } },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    return {
      title: 'Employee Document Expiry Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Employee', key: 'employee' },
        { header: 'Document Type', key: 'type' },
        { header: 'Document Name', key: 'name' },
        { header: 'Expiry Date', key: 'expiryDate' },
      ],
      rows: documents.map((d) => ({
        employeeNumber: d.employee.employeeNumber,
        employee: `${d.employee.firstName} ${d.employee.lastName}`,
        type: d.type,
        name: d.name,
        expiryDate: d.expiryDate?.toISOString().slice(0, 10) ?? '',
      })),
    };
  }

  private async leaveBalance(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const balances = await this.prisma.leaveBalance.findMany({
      where: { employee: { organizationId, ...(filters.departmentId ? { departmentId: filters.departmentId } : {}) }, year: new Date().getFullYear() },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } }, leaveType: true },
      orderBy: { employeeId: 'asc' },
    });
    return {
      title: 'Leave Balance Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Employee', key: 'employee' },
        { header: 'Leave Type', key: 'leaveType' },
        { header: 'Opening', key: 'opening' },
        { header: 'Accrued', key: 'accrued' },
        { header: 'Used', key: 'used' },
        { header: 'Pending', key: 'pending' },
        { header: 'Available', key: 'available' },
      ],
      rows: balances.map((b) => ({
        employeeNumber: b.employee.employeeNumber,
        employee: `${b.employee.firstName} ${b.employee.lastName}`,
        leaveType: b.leaveType.name,
        opening: Number(b.opening),
        accrued: Number(b.accrued),
        used: Number(b.used),
        pending: Number(b.pending),
        available: Number(b.opening) + Number(b.accrued) + Number(b.carriedForward) + Number(b.adjusted) - Number(b.used) - Number(b.pending) - Number(b.expired),
      })),
    };
  }

  private async leaveApplication(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status as any } : {}),
        ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
        ...(filters.from || filters.to
          ? { fromDate: { ...(filters.to ? { lte: new Date(filters.to) } : {}) }, toDate: { ...(filters.from ? { gte: new Date(filters.from) } : {}) } }
          : {}),
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } }, leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      title: 'Leave Application Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Employee', key: 'employee' },
        { header: 'Leave Type', key: 'leaveType' },
        { header: 'From', key: 'fromDate' },
        { header: 'To', key: 'toDate' },
        { header: 'Days', key: 'totalDays' },
        { header: 'Status', key: 'status' },
      ],
      rows: requests.map((r) => ({
        employeeNumber: r.employee.employeeNumber,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        leaveType: r.leaveType.name,
        fromDate: r.fromDate.toISOString().slice(0, 10),
        toDate: r.toDate.toISOString().slice(0, 10),
        totalDays: Number(r.totalDays),
        status: r.status,
      })),
    };
  }

  private async attendance(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
        ...(filters.from || filters.to
          ? { date: { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lte: new Date(filters.to) } : {}) } }
          : {}),
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { date: 'desc' },
    });
    return {
      title: 'Attendance Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Employee', key: 'employee' },
        { header: 'Date', key: 'date' },
        { header: 'Check In', key: 'checkIn' },
        { header: 'Check Out', key: 'checkOut' },
        { header: 'Working Hours', key: 'workingHours' },
        { header: 'Status', key: 'status' },
      ],
      rows: records.map((r) => ({
        employeeNumber: r.employee.employeeNumber,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        date: r.date.toISOString().slice(0, 10),
        checkIn: r.checkInAt?.toISOString().slice(11, 16) ?? '',
        checkOut: r.checkOutAt?.toISOString().slice(11, 16) ?? '',
        workingHours: r.workingMinutes ? Math.round((r.workingMinutes / 60) * 100) / 100 : '',
        status: r.status,
      })),
    };
  }

  private async overtime(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        overtimeMinutes: { gt: 0 },
        ...(filters.from || filters.to
          ? { date: { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lte: new Date(filters.to) } : {}) } }
          : {}),
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { date: 'desc' },
    });
    return {
      title: 'Overtime Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Employee', key: 'employee' },
        { header: 'Date', key: 'date' },
        { header: 'Overtime (hrs)', key: 'overtimeHours' },
      ],
      rows: records.map((r) => ({
        employeeNumber: r.employee.employeeNumber,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        date: r.date.toISOString().slice(0, 10),
        overtimeHours: Math.round((r.overtimeMinutes / 60) * 100) / 100,
      })),
    };
  }

  private async regularizations(organizationId: string, filters: ReportFilters): Promise<ReportResult> {
    const records = await this.prisma.attendanceRegularization.findMany({
      where: { organizationId, ...(filters.status ? { status: filters.status as any } : {}) },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      title: 'Attendance Regularization Report',
      columns: [
        { header: 'Employee No', key: 'employeeNumber' },
        { header: 'Employee', key: 'employee' },
        { header: 'Date', key: 'date' },
        { header: 'Type', key: 'type' },
        { header: 'Status', key: 'status' },
        { header: 'Reason', key: 'reason' },
      ],
      rows: records.map((r) => ({
        employeeNumber: r.employee.employeeNumber,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        date: r.date.toISOString().slice(0, 10),
        type: r.type,
        status: r.status,
        reason: r.reason,
      })),
    };
  }
}
