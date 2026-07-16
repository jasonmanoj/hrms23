import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { OrgStructureService } from './org-structure.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

interface LookupDto {
  name: string;
  code?: string;
}

@Controller('business-units')
export class BusinessUnitsController {
  constructor(private readonly service: OrgStructureService) {}

  @Get()
  @RequirePermissions('departments', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list('businessUnit', user.organizationId);
  }

  @Post()
  @RequirePermissions('departments', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: LookupDto) {
    return this.service.create('businessUnit', user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('departments', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LookupDto) {
    return this.service.update('businessUnit', user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('departments', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove('businessUnit', user.organizationId, id);
  }
}

@Controller('grades')
export class GradesController {
  constructor(private readonly service: OrgStructureService) {}

  @Get()
  @RequirePermissions('departments', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list('grade', user.organizationId);
  }

  @Post()
  @RequirePermissions('departments', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: LookupDto) {
    return this.service.create('grade', user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('departments', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LookupDto) {
    return this.service.update('grade', user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('departments', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove('grade', user.organizationId, id);
  }
}

@Controller('cost-centers')
export class CostCentersController {
  constructor(private readonly service: OrgStructureService) {}

  @Get()
  @RequirePermissions('departments', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list('costCenter', user.organizationId);
  }

  @Post()
  @RequirePermissions('departments', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: LookupDto) {
    return this.service.create('costCenter', user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('departments', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LookupDto) {
    return this.service.update('costCenter', user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('departments', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove('costCenter', user.organizationId, id);
  }
}
