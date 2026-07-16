import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertShiftDto } from './dto/upsert-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.shift.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  create(organizationId: string, dto: UpsertShiftDto) {
    return this.prisma.shift.create({ data: { organizationId, ...dto } as any });
  }

  async update(organizationId: string, id: string, dto: UpsertShiftDto) {
    const shift = await this.prisma.shift.findFirst({ where: { id, organizationId } });
    if (!shift) throw new NotFoundException('Shift not found');
    return this.prisma.shift.update({ where: { id }, data: dto as any });
  }

  async assign(organizationId: string, employeeId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({ where: { id: shiftId, organizationId } });
    if (!shift) throw new NotFoundException('Shift not found');
    await this.prisma.shiftAssignment.updateMany({ where: { employeeId, effectiveTo: null }, data: { effectiveTo: new Date() } });
    return this.prisma.shiftAssignment.create({ data: { employeeId, shiftId } });
  }

  async currentShift(employeeId: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { employeeId, effectiveTo: null },
      include: { shift: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    return assignment?.shift ?? null;
  }
}
