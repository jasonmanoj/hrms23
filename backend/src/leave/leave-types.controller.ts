import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { LeaveTypesService } from './leave-types.service';
import { UpsertLeaveTypeDto } from './dto/upsert-leave-type.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('leave/types')
export class LeaveTypesController {
  constructor(private readonly leaveTypes: LeaveTypesService) {}

  @Get()
  @RequirePermissions('leave-types', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveTypes.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('leave-types', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertLeaveTypeDto) {
    return this.leaveTypes.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('leave-types', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertLeaveTypeDto) {
    return this.leaveTypes.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('leave-types', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveTypes.remove(user.organizationId, id);
  }
}
