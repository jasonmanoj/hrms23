import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLeaveTypeDto } from './dto/upsert-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.leaveType.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async get(organizationId: string, id: string) {
    const leaveType = await this.prisma.leaveType.findFirst({ where: { id, organizationId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    return leaveType;
  }

  create(organizationId: string, dto: UpsertLeaveTypeDto) {
    return this.prisma.leaveType.create({ data: { organizationId, ...dto } as any });
  }

  async update(organizationId: string, id: string, dto: UpsertLeaveTypeDto) {
    await this.get(organizationId, id);
    return this.prisma.leaveType.update({ where: { id }, data: dto as any });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.leaveType.update({ where: { id }, data: { active: false } });
    return { success: true };
  }
}
