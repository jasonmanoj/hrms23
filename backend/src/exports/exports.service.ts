import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilters, ReportKey } from '../reports/report-definitions';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('exports') private readonly queue: Queue,
  ) {}

  async enqueue(organizationId: string, requestedById: string, reportKey: ReportKey, format: 'XLSX' | 'CSV', filters: ReportFilters) {
    const job = await this.prisma.exportJob.create({
      data: { organizationId, requestedById, reportKey, format, filters: filters as any, status: ExportStatus.QUEUED },
    });
    await this.queue.add('generate-export', { exportJobId: job.id });
    return job;
  }

  list(organizationId: string) {
    return this.prisma.exportJob.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async get(organizationId: string, id: string) {
    return this.prisma.exportJob.findFirst({ where: { id, organizationId } });
  }
}
