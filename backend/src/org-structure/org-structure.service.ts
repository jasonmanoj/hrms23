import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LookupModel = 'businessUnit' | 'grade' | 'costCenter';

// Business units, grades and cost centers are simple named lookups referenced by
// Employee. They share identical CRUD shape, so one service handles all three.
@Injectable()
export class OrgStructureService {
  constructor(private readonly prisma: PrismaService) {}

  list(model: LookupModel, organizationId: string) {
    return (this.prisma[model] as any).findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async create(model: LookupModel, organizationId: string, data: { name: string; code?: string }) {
    return (this.prisma[model] as any).create({ data: { organizationId, ...data } });
  }

  async update(model: LookupModel, organizationId: string, id: string, data: { name: string; code?: string }) {
    const existing = await (this.prisma[model] as any).findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Record not found');
    return (this.prisma[model] as any).update({ where: { id }, data });
  }

  async remove(model: LookupModel, organizationId: string, id: string) {
    const existing = await (this.prisma[model] as any).findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Record not found');
    await (this.prisma[model] as any).delete({ where: { id } });
    return { success: true };
  }
}
