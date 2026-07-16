import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { RolesService } from './roles.service';
import { UpsertRoleDto } from './dto/upsert-role.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MODULES } from '../common/constants/modules';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('modules')
  @RequirePermissions('roles', PermissionAction.VIEW)
  listModules() {
    return MODULES;
  }

  @Get()
  @RequirePermissions('roles', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.roles.list(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('roles', PermissionAction.VIEW)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roles.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('roles', PermissionAction.CONFIGURE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertRoleDto) {
    return this.roles.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('roles', PermissionAction.CONFIGURE)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertRoleDto) {
    return this.roles.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('roles', PermissionAction.CONFIGURE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roles.remove(user.organizationId, id);
  }
}
