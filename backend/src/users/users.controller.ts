import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PermissionAction, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users', PermissionAction.VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.users.list(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('users', PermissionAction.VIEW)
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.get(user.organizationId, id);
  }

  @Post('invite')
  @RequirePermissions('users', PermissionAction.CREATE)
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.users.invite(user.organizationId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('users', PermissionAction.EDIT)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user.organizationId, user.userId, id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('users', PermissionAction.EDIT)
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.setStatus(user.organizationId, user.userId, id, UserStatus.ACTIVE);
  }

  @Post(':id/deactivate')
  @RequirePermissions('users', PermissionAction.EDIT)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.setStatus(user.organizationId, user.userId, id, UserStatus.INACTIVE);
  }

  @Post(':id/lock')
  @RequirePermissions('users', PermissionAction.EDIT)
  lock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.setStatus(user.organizationId, user.userId, id, UserStatus.LOCKED);
  }

  @Post(':id/unlock')
  @RequirePermissions('users', PermissionAction.EDIT)
  unlock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.setStatus(user.organizationId, user.userId, id, UserStatus.ACTIVE);
  }

  @Post(':id/force-password-reset')
  @RequirePermissions('users', PermissionAction.EDIT)
  forcePasswordReset(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.forcePasswordReset(user.organizationId, user.userId, id);
  }

  @Post(':id/revoke-sessions')
  @RequirePermissions('users', PermissionAction.EDIT)
  revokeSessions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.revokeSessions(user.organizationId, user.userId, id);
  }
}
