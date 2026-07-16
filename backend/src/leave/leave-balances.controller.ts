import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { LeaveBalancesService } from './leave-balances.service';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('leave/balances')
export class LeaveBalancesController {
  constructor(private readonly leaveBalances: LeaveBalancesService) {}

  @Get('me')
  @RequirePermissions('leave-balances', PermissionAction.VIEW_OWN)
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveBalances.forEmployee(user.employeeId!);
  }

  @Get('employee/:employeeId')
  @RequirePermissions('leave-balances', PermissionAction.VIEW)
  forEmployee(@Param('employeeId') employeeId: string) {
    return this.leaveBalances.forEmployee(employeeId);
  }

  @Post('adjust')
  @RequirePermissions('leave-balances', PermissionAction.EDIT)
  adjust(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdjustBalanceDto) {
    return this.leaveBalances.adjust(user.organizationId, user.userId, dto.employeeId, dto.leaveTypeId, dto.amount, dto.note);
  }

  @Post('accrue')
  @RequirePermissions('leave-balances', PermissionAction.CONFIGURE)
  accrue(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveBalances.runAccrual(user.organizationId);
  }
}
