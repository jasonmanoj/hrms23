import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { HolidaysService } from './holidays.service';
import { HolidaysController } from './holidays.controller';
import { AttendancePoliciesService } from './attendance-policies.service';
import { AttendancePoliciesController } from './attendance-policies.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { RegularizationsService } from './regularizations.service';
import { RegularizationsController } from './regularizations.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditLogsModule, NotificationsModule],
  providers: [ShiftsService, HolidaysService, AttendancePoliciesService, AttendanceService, RegularizationsService],
  controllers: [ShiftsController, HolidaysController, AttendancePoliciesController, AttendanceController, RegularizationsController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
