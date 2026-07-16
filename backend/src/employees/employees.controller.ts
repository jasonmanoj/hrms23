import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { EmployeeStatus, PermissionAction } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { UpsertEmployeeDto } from './dto/upsert-employee.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions('employees', PermissionAction.VIEW)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('search') search?: string,
  ) {
    return this.employees.list(user, { departmentId, status, search });
  }

  @Get('document-expiries')
  @RequirePermissions('employees', PermissionAction.VIEW)
  documentExpiries(@CurrentUser() user: AuthenticatedUser, @Query('withinDays') withinDays?: string) {
    return this.employees.upcomingDocumentExpiries(user.organizationId, withinDays ? Number(withinDays) : 30);
  }

  @Get('me')
  @RequirePermissions('employees', PermissionAction.VIEW_OWN)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.get(user, user.employeeId!);
  }

  @Get(':id')
  @RequirePermissions('employees', PermissionAction.VIEW)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employees.get(user, id);
  }

  @Post()
  @RequirePermissions('employees', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertEmployeeDto) {
    return this.employees.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('employees', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertEmployeeDto) {
    return this.employees.update(user, id, dto);
  }

  @Post(':id/status')
  @RequirePermissions('employees', PermissionAction.EDIT)
  changeStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.employees.changeStatus(user, id, dto.status, dto.reason);
  }
}
