import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHolidayDto } from './dto/upsert-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, year?: number) {
    return this.prisma.holiday.findMany({
      where: { organizationId, ...(year ? { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } } : {}) },
      orderBy: { date: 'asc' },
    });
  }

  create(organizationId: string, dto: UpsertHolidayDto) {
    return this.prisma.holiday.create({ data: { organizationId, name: dto.name, date: new Date(dto.date), locationId: dto.locationId } });
  }

  async remove(organizationId: string, id: string) {
    const holiday = await this.prisma.holiday.findFirst({ where: { id, organizationId } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.prisma.holiday.delete({ where: { id } });
    return { success: true };
  }
}
