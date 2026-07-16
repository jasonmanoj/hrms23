import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertLocationDto } from './dto/upsert-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.location.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async get(organizationId: string, id: string) {
    const location = await this.prisma.location.findFirst({ where: { id, organizationId } });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  create(organizationId: string, dto: UpsertLocationDto) {
    return this.prisma.location.create({ data: { organizationId, ...dto } });
  }

  async update(organizationId: string, id: string, dto: UpsertLocationDto) {
    await this.get(organizationId, id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.location.delete({ where: { id } });
    return { success: true };
  }
}
