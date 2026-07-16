import { Body, Controller, Get, Put } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('organization')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @RequirePermissions('organizations', PermissionAction.VIEW)
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.get(user.organizationId);
  }

  @Put()
  @RequirePermissions('organizations', PermissionAction.CONFIGURE)
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizationDto) {
    return this.organizations.update(user.organizationId, user.userId, dto);
  }
}
