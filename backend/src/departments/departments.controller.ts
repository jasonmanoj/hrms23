import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { DepartmentsService } from './departments.service';
import { UpsertDepartmentDto } from './dto/upsert-department.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermissions('departments', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.departments.list(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('departments', PermissionAction.VIEW)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departments.get(user.organizationId, id);
  }

  @Post()
  @RequirePermissions('departments', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertDepartmentDto) {
    return this.departments.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('departments', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertDepartmentDto) {
    return this.departments.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('departments', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departments.remove(user.organizationId, id);
  }
}
