import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertDesignationDto } from './dto/upsert-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.designation.findMany({ where: { organizationId }, orderBy: { title: 'asc' } });
  }

  async get(organizationId: string, id: string) {
    const designation = await this.prisma.designation.findFirst({ where: { id, organizationId } });
    if (!designation) throw new NotFoundException('Designation not found');
    return designation;
  }

  create(organizationId: string, dto: UpsertDesignationDto) {
    return this.prisma.designation.create({ data: { organizationId, ...dto } });
  }

  async update(organizationId: string, id: string, dto: UpsertDesignationDto) {
    await this.get(organizationId, id);
    return this.prisma.designation.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.designation.delete({ where: { id } });
    return { success: true };
  }
}
