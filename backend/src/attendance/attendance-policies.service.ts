import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAttendancePolicyDto } from './dto/upsert-attendance-policy.dto';

@Injectable()
export class AttendancePoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.attendancePolicy.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async default(organizationId: string) {
    const policy = await this.prisma.attendancePolicy.findFirst({ where: { organizationId, isDefault: true } });
    return policy ?? this.prisma.attendancePolicy.findFirst({ where: { organizationId } });
  }

  async create(organizationId: string, dto: UpsertAttendancePolicyDto) {
    if (dto.isDefault) await this.prisma.attendancePolicy.updateMany({ where: { organizationId }, data: { isDefault: false } });
    return this.prisma.attendancePolicy.create({ data: { organizationId, ...dto } as any });
  }

  async update(organizationId: string, id: string, dto: UpsertAttendancePolicyDto) {
    const policy = await this.prisma.attendancePolicy.findFirst({ where: { id, organizationId } });
    if (!policy) throw new NotFoundException('Attendance policy not found');
    if (dto.isDefault) await this.prisma.attendancePolicy.updateMany({ where: { organizationId }, data: { isDefault: false } });
    return this.prisma.attendancePolicy.update({ where: { id }, data: dto as any });
  }
}
