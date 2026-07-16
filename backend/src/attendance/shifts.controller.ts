import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { ShiftsService } from './shifts.service';
import { UpsertShiftDto } from './dto/upsert-shift.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('attendance/shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  @RequirePermissions('shifts', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.shifts.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('shifts', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertShiftDto) {
    return this.shifts.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('shifts', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertShiftDto) {
    return this.shifts.update(user.organizationId, id, dto);
  }

  @Post('assign')
  @RequirePermissions('shifts', PermissionAction.CONFIGURE)
  assign(@CurrentUser() user: AuthenticatedUser, @Body() dto: { employeeId: string; shiftId: string }) {
    return this.shifts.assign(user.organizationId, dto.employeeId, dto.shiftId);
  }
}
