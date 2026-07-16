import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { LeaveModule } from '../leave/leave.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [LeaveModule, NotificationsModule],
  providers: [ScheduledTasksService],
})
export class JobsModule {}
