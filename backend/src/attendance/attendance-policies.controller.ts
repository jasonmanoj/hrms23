import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AttendancePoliciesService } from './attendance-policies.service';
import { UpsertAttendancePolicyDto } from './dto/upsert-attendance-policy.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('attendance/policies')
export class AttendancePoliciesController {
  constructor(private readonly policies: AttendancePoliciesService) {}

  @Get()
  @RequirePermissions('attendance-policies', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.policies.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('attendance-policies', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertAttendancePolicyDto) {
    return this.policies.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('attendance-policies', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertAttendancePolicyDto) {
    return this.policies.update(user.organizationId, id, dto);
  }
}
