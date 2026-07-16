import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { HolidaysService } from './holidays.service';
import { UpsertHolidayDto } from './dto/upsert-holiday.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('attendance/holidays')
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @RequirePermissions('holidays', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser, @Query('year') year?: string) {
    return this.holidays.list(user.organizationId, year ? Number(year) : undefined);
  }

  @Post()
  @RequirePermissions('holidays', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertHolidayDto) {
    return this.holidays.create(user.organizationId, dto);
  }

  @Delete(':id')
  @RequirePermissions('holidays', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.holidays.remove(user.organizationId, id);
  }
}
