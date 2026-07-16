import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { LocationsService } from './locations.service';
import { UpsertLocationDto } from './dto/upsert-location.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @RequirePermissions('locations', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.locations.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('locations', PermissionAction.CREATE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertLocationDto) {
    return this.locations.create(user.organizationId, dto);
  }

  @Put(':id')
  @RequirePermissions('locations', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertLocationDto) {
    return this.locations.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('locations', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.locations.remove(user.organizationId, id);
  }
}
