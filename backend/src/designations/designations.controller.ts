import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { DesignationsService } from './designations.service';
import { UpsertDesignationDto } from './dto/upsert-designation.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('designations')
export class DesignationsController {
  constructor(private readonly designations: DesignationsService) {}

  @Get()
  @RequirePermissions('designations', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.designations.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('designations', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertDesignationDto) {
    return this.designations.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('designations', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertDesignationDto) {
    return this.designations.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('designations', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.designations.remove(user.organizationId, id);
  }
}
