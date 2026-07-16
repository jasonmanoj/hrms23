import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PermissionAction, RegularizationStatus } from '@prisma/client';
import { RegularizationsService } from './regularizations.service';
import { RequestRegularizationDto, ResolveRegularizationDto } from './dto/regularization.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('attendance/regularizations')
export class RegularizationsController {
  constructor(private readonly regularizations: RegularizationsService) {}

  @Get()
  @RequirePermissions('regularizations', PermissionAction.VIEW_OWN)
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: RegularizationStatus, @Query('employeeId') employeeId?: string) {
    return this.regularizations.list(user, { status, employeeId });
  }

  @Post()
  @RequirePermissions('regularizations', PermissionAction.CREATE)
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestRegularizationDto) {
    return this.regularizations.request(user, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('regularizations', PermissionAction.APPROVE)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ResolveRegularizationDto) {
    return this.regularizations.resolve(user, id, true, dto.comments);
  }

  @Post(':id/reject')
  @RequirePermissions('regularizations', PermissionAction.APPROVE)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ResolveRegularizationDto) {
    return this.regularizations.resolve(user, id, false, dto.comments);
  }
}
