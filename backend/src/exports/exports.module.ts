import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { ExportProcessor } from './export.processor';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'exports' }), ReportsModule],
  providers: [ExportsService, ExportProcessor],
  controllers: [ExportsController],
  exports: [ExportsService],
})
export class ExportsModule {}
