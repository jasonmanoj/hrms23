import { Module } from '@nestjs/common';
import { LeaveTypesService } from './leave-types.service';
import { LeaveTypesController } from './leave-types.controller';
import { LeavePoliciesService } from './leave-policies.service';
import { LeavePoliciesController } from './leave-policies.controller';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveBalancesController } from './leave-balances.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditLogsModule, NotificationsModule],
  providers: [LeaveTypesService, LeavePoliciesService, LeaveBalancesService, LeaveRequestsService],
  controllers: [LeaveTypesController, LeavePoliciesController, LeaveBalancesController, LeaveRequestsController],
  exports: [LeaveBalancesService],
})
export class LeaveModule {}
