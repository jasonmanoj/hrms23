import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { PermissionAction } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, UpsertAttendanceDto } from './dto/check-in.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('check-in')
  @RequirePermissions('attendance', PermissionAction.CREATE)
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto, @Req() req: Request) {
    return this.attendance.checkIn(user, dto, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Post('check-out')
  @RequirePermissions('attendance', PermissionAction.CREATE)
  checkOut(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckOutDto) {
    return this.attendance.checkOut(user, dto);
  }

  @Post('break/start')
  @RequirePermissions('attendance', PermissionAction.CREATE)
  startBreak(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.startBreak(user);
  }

  @Post('break/end')
  @RequirePermissions('attendance', PermissionAction.CREATE)
  endBreak(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.endBreak(user);
  }

  @Get('today')
  @RequirePermissions('attendance', PermissionAction.VIEW_OWN)
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.todayStatus(user);
  }

  @Get('history')
  @RequirePermissions('attendance', PermissionAction.VIEW_OWN)
  history(@CurrentUser() user: AuthenticatedUser, @Query('employeeId') employeeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.attendance.history(user, { employeeId, from, to });
  }

  @Get('anomalies')
  @RequirePermissions('attendance', PermissionAction.VIEW)
  anomalies(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.attendance.anomalies(user.organizationId, date);
  }

  @Post('admin/upsert')
  @RequirePermissions('attendance', PermissionAction.EDIT)
  adminUpsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertAttendanceDto) {
    return this.attendance.adminUpsert(user, dto);
  }

  @Post('admin/:id/lock')
  @RequirePermissions('attendance', PermissionAction.CONFIGURE)
  lock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attendance.lock(user, id, true);
  }

  @Post('admin/:id/unlock')
  @RequirePermissions('attendance', PermissionAction.CONFIGURE)
  unlock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attendance.lock(user, id, false);
  }
}
