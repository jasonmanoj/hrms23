import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { LeavePoliciesService } from './leave-policies.service';
import { AssignLeavePolicyDto, UpsertLeavePolicyDto } from './dto/upsert-leave-policy.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('leave/policies')
export class LeavePoliciesController {
  constructor(private readonly leavePolicies: LeavePoliciesService) {}

  @Get()
  @RequirePermissions('leave-policies', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.leavePolicies.list(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('leave-policies', PermissionAction.VIEW)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leavePolicies.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('leave-policies', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertLeavePolicyDto) {
    return this.leavePolicies.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('leave-policies', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertLeavePolicyDto) {
    return this.leavePolicies.update(user.organizationId, id, dto);
  }

  @Post('assign')
  @RequirePermissions('leave-policies', PermissionAction.CONFIGURE)
  assign(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssignLeavePolicyDto) {
    return this.leavePolicies.assign(user.organizationId, dto.employeeId, dto.leavePolicyId);
  }

  @Get('employee/:employeeId')
  @RequirePermissions('leave-policies', PermissionAction.VIEW)
  assignmentsForEmployee(@CurrentUser() user: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.leavePolicies.assignmentsForEmployee(user.organizationId, employeeId);
  }
}
