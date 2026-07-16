import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { generateToken } from '../common/utils/password.util';

const INVITATION_TTL_HOURS = 72;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  list(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      include: { role: true, employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId }, include: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async invite(organizationId: string, actorUserId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email: dto.email } },
    });
    if (existing) throw new ConflictException('A user with this email already exists');

    const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, organizationId } });
    if (!role) throw new BadRequestException('Invalid role');

    const invitationToken = generateToken();
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        username: dto.username,
        roleId: dto.roleId,
        employeeId: dto.employeeId,
        status: UserStatus.INVITED,
        invitationToken,
        invitationExpiresAt: new Date(Date.now() + INVITATION_TTL_HOURS * 3600 * 1000),
      },
    });

    await this.notifications.notify({
      organizationId,
      userId: user.id,
      type: 'ACCOUNT_INVITATION',
      title: 'Welcome to HRMS',
      message: `You have been invited to the HRMS portal. Use invitation token to set your password.`,
      email: user.email,
    });

    await this.auditLogs.record({
      organizationId,
      userId: actorUserId,
      action: 'INVITE_USER',
      module: 'users',
      recordId: user.id,
      newValue: { email: user.email, roleId: user.roleId },
    });

    return user;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateUserDto) {
    const user = await this.get(organizationId, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { roleId: dto.roleId, username: dto.username },
    });
    await this.auditLogs.record({
      organizationId,
      userId: actorUserId,
      action: 'UPDATE_USER',
      module: 'users',
      recordId: id,
      previousValue: { roleId: user.roleId, username: user.username },
      newValue: { roleId: updated.roleId, username: updated.username },
    });
    return updated;
  }

  async setStatus(organizationId: string, actorUserId: string, id: string, status: UserStatus) {
    await this.get(organizationId, id);
    const updated = await this.prisma.user.update({ where: { id }, data: { status, failedLoginCount: 0, lockedUntil: null } });
    await this.auditLogs.record({ organizationId, userId: actorUserId, action: `SET_STATUS_${status}`, module: 'users', recordId: id });
    return updated;
  }

  async forcePasswordReset(organizationId: string, actorUserId: string, id: string) {
    await this.get(organizationId, id);
    const updated = await this.prisma.user.update({ where: { id }, data: { passwordResetRequired: true } });
    await this.auditLogs.record({ organizationId, userId: actorUserId, action: 'FORCE_PASSWORD_RESET', module: 'users', recordId: id });
    return updated;
  }

  async revokeSessions(organizationId: string, actorUserId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } });
    await this.auditLogs.record({ organizationId, userId: actorUserId, action: 'REVOKE_SESSIONS', module: 'users', recordId: id });
    return { success: true };
  }
}
