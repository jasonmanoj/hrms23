import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { nanoid } from 'nanoid';
import { PermissionAction, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AcceptInvitationDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/misc.dto';
import { generateToken, hashPassword, isPasswordStrong, verifyPassword } from '../common/utils/password.util';
import { hashToken } from './token.util';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const RESET_TOKEN_TTL_HOURS = 2;

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly roles: RolesService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async signup(dto: SignupDto, meta: RequestMeta) {
    if (!isPasswordStrong(dto.adminPassword)) {
      throw new BadRequestException('Password must be at least 10 characters and include upper, lower, digit and symbol');
    }
    const existingOrg = await this.prisma.organization.findFirst({ where: { name: dto.organizationName } });
    if (existingOrg) throw new ConflictException('An organization with this name already exists');

    const organization = await this.prisma.organization.create({ data: { name: dto.organizationName } });
    const roles = await this.roles.seedDefaultRoles(organization.id);
    const passwordHash = await hashPassword(dto.adminPassword);

    const employee = await this.prisma.employee.create({
      data: {
        organizationId: organization.id,
        employeeNumber: 'EMP-0001',
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        personalEmail: dto.adminEmail,
        status: 'ACTIVE',
        dateOfJoining: new Date(),
      },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId: organization.id,
        email: dto.adminEmail,
        roleId: roles.SUPER_ADMIN.id,
        employeeId: employee.id,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    await this.auditLogs.record({
      organizationId: organization.id,
      userId: user.id,
      action: 'ORGANIZATION_SIGNUP',
      module: 'organizations',
      recordId: organization.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.issueTokens(user.id, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    // Simplified for MVP: resolves the first matching account by email. A production
    // multi-org deployment would disambiguate via subdomain or an explicit org picker.
    const user = await this.prisma.user.findFirst({ where: { email: dto.email }, include: { role: { include: { permissions: true } } } });

    const genericError = () => new UnauthorizedException('Invalid email or password');

    if (!user || !user.passwordHash) {
      throw genericError();
    }
    if (user.status === UserStatus.LOCKED || (user.lockedUntil && user.lockedUntil > new Date())) {
      throw new UnauthorizedException('Account is locked. Try again later or contact an administrator.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw genericError();
    }

    const valid = await verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil = failedLoginCount >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
      throw genericError();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.auditLogs.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'LOGIN',
      module: 'auth',
      recordId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.issueTokens(user.id, meta);
  }

  async refresh(refreshTokenPlain: string, meta: RequestMeta) {
    const tokenHash = hashToken(refreshTokenPlain);
    const stored = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revoked) {
      // Reuse of an already-rotated token indicates possible theft: revoke the whole family.
      await this.prisma.refreshToken.updateMany({ where: { family: stored.family }, data: { revoked: true } });
      throw new UnauthorizedException('Refresh token reuse detected; all sessions revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return this.issueTokens(stored.userId, meta, stored.family);
  }

  async logout(refreshTokenPlain: string) {
    const tokenHash = hashToken(refreshTokenPlain);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email } });
    // Always respond the same way to avoid user enumeration.
    if (user) {
      const token = generateToken();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: hashToken(token), passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 3600 * 1000) },
      });
      // In production this token is emailed via NotificationsService/MailService.
    }
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!isPasswordStrong(dto.password)) {
      throw new BadRequestException('Password must be at least 10 characters and include upper, lower, digit and symbol');
    }
    const tokenHash = hashToken(dto.token);
    const user = await this.prisma.user.findFirst({ where: { passwordResetToken: tokenHash } });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null, passwordResetRequired: false, failedLoginCount: 0, lockedUntil: null },
    });
    await this.prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
    return { success: true };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    if (!isPasswordStrong(dto.password)) {
      throw new BadRequestException('Password must be at least 10 characters and include upper, lower, digit and symbol');
    }
    const tokenHash = hashToken(dto.token);
    const user = await this.prisma.user.findFirst({ where: { invitationToken: tokenHash } });
    if (!user || !user.invitationExpiresAt || user.invitationExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, status: UserStatus.ACTIVE, invitationToken: null, invitationExpiresAt: null },
    });
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (!isPasswordStrong(dto.newPassword)) {
      throw new BadRequestException('Password must be at least 10 characters and include upper, lower, digit and symbol');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordResetRequired: false } });
    return { success: true };
  }

  private async issueTokens(userId: string, meta: RequestMeta, existingFamily?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });

    const permissions = (user.role?.permissions ?? []).map((p) => `${p.module}:${p.action}` as string);

    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        organizationId: user.organizationId,
        roleId: user.roleId,
        roleKey: user.role?.key ?? null,
        employeeId: user.employeeId,
        permissions,
      },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    const refreshTokenPlain = generateToken();
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const family = existingFamily ?? nanoid();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshTokenPlain),
        family,
        expiresAt: new Date(Date.now() + parseDurationMs(refreshExpiresIn)),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        roleKey: user.role?.key ?? null,
        roleName: user.role?.name ?? null,
        employeeId: user.employeeId,
        passwordResetRequired: user.passwordResetRequired,
      },
    };
  }
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 3600 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] ?? 86400000;
  return value * unitMs;
}
