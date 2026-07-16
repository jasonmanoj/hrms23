import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LeaveRequestStatus, PermissionAction } from '@prisma/client';
import { LeaveRequestsService } from './leave-requests.service';
import { ApplyLeaveDto, ApprovalActionDto } from './dto/apply-leave.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('leave/requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequests: LeaveRequestsService) {}

  @Get()
  @RequirePermissions('leave-requests', PermissionAction.VIEW_OWN)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: LeaveRequestStatus,
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.leaveRequests.list(user, { status, employeeId, leaveTypeId, from, to });
  }

  @Get('calendar')
  @RequirePermissions('leave-requests', PermissionAction.VIEW_OWN)
  calendar(@CurrentUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.leaveRequests.calendar(user.organizationId, from, to);
  }

  @Get(':id')
  @RequirePermissions('leave-requests', PermissionAction.VIEW_OWN)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveRequests.get(user, id);
  }

  @Post()
  @RequirePermissions('leave-requests', PermissionAction.CREATE)
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyLeaveDto) {
    return this.leaveRequests.apply(user, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('leave-requests', PermissionAction.APPROVE)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ApprovalActionDto) {
    return this.leaveRequests.act(user, id, 'APPROVE', dto.comments);
  }

  @Post(':id/reject')
  @RequirePermissions('leave-requests', PermissionAction.APPROVE)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ApprovalActionDto) {
    return this.leaveRequests.act(user, id, 'REJECT', dto.comments);
  }

  @Post(':id/return')
  @RequirePermissions('leave-requests', PermissionAction.APPROVE)
  returnForCorrection(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ApprovalActionDto) {
    return this.leaveRequests.act(user, id, 'RETURN', dto.comments);
  }

  @Post(':id/cancel')
  @RequirePermissions('leave-requests', PermissionAction.VIEW_OWN)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveRequests.cancel(user, id);
  }

  @Post(':id/cancellation/approve')
  @RequirePermissions('leave-requests', PermissionAction.APPROVE)
  approveCancellation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveRequests.resolveCancellation(user, id, true);
  }

  @Post(':id/cancellation/reject')
  @RequirePermissions('leave-requests', PermissionAction.APPROVE)
  rejectCancellation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveRequests.resolveCancellation(user, id, false);
  }
}
