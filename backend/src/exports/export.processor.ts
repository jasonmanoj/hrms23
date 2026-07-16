import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExportStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { ReportKey } from '../reports/report-definitions';

const EXPORT_ROOT = process.env.UPLOAD_DIR ? join(process.env.UPLOAD_DIR, 'exports') : './uploads/exports';

@Processor('exports')
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {
    super();
  }

  async process(job: Job<{ exportJobId: string }>) {
    const exportJob = await this.prisma.exportJob.findUnique({ where: { id: job.data.exportJobId } });
    if (!exportJob) return;

    await this.prisma.exportJob.update({ where: { id: exportJob.id }, data: { status: ExportStatus.PROCESSING } });

    try {
      const result = await this.reports.generate(exportJob.organizationId, exportJob.reportKey as ReportKey, (exportJob.filters as any) ?? {});

      if (!existsSync(EXPORT_ROOT)) mkdirSync(EXPORT_ROOT, { recursive: true });
      const filename = `${exportJob.reportKey}-${Date.now()}.${exportJob.format === 'CSV' ? 'csv' : 'xlsx'}`;
      const filePath = join(EXPORT_ROOT, filename);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'HRMS';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet(result.title.slice(0, 31));

      sheet.addRow([result.title]);
      sheet.addRow([`Generated: ${new Date().toISOString()}`]);
      sheet.addRow([]);
      const headerRowIndex = 4;
      sheet.getRow(headerRowIndex).values = result.columns.map((c) => c.header);
      sheet.getRow(headerRowIndex).font = { bold: true };
      result.columns.forEach((c, i) => {
        sheet.getColumn(i + 1).width = c.width ?? 20;
      });
      for (const row of result.rows) {
        sheet.addRow(result.columns.map((c) => row[c.key] ?? ''));
      }

      if (exportJob.format === 'CSV') {
        await workbook.csv.writeFile(filePath);
      } else {
        await workbook.xlsx.writeFile(filePath);
      }

      await this.prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: ExportStatus.COMPLETED, fileUrl: filename, completedAt: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`Export job ${exportJob.id} failed`, error?.stack);
      await this.prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: ExportStatus.FAILED, errorMessage: String(error?.message ?? error) },
      });
    }
  }
}
