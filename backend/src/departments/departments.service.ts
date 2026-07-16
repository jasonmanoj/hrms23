import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertDepartmentDto } from './dto/upsert-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async get(organizationId: string, id: string) {
    const department = await this.prisma.department.findFirst({ where: { id, organizationId } });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  create(organizationId: string, dto: UpsertDepartmentDto) {
    return this.prisma.department.create({ data: { organizationId, ...dto } });
  }

  async update(organizationId: string, id: string, dto: UpsertDepartmentDto) {
    await this.get(organizationId, id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.department.delete({ where: { id } });
    return { success: true };
  }
}
