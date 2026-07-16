import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRoleDto } from './dto/upsert-role.dto';
import { MODULES } from '../common/constants/modules';
import { DEFAULT_ROLE_PERMISSIONS } from '../common/constants/default-role-permissions';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates the nine built-in roles with their default permission grants for a freshly
  // created organization. Called once at organization signup and by the demo seed script.
  async seedDefaultRoles(organizationId: string) {
    const entries = Object.entries(DEFAULT_ROLE_PERMISSIONS) as [Exclude<RoleKey, 'CUSTOM'>, { module: string; actions: any[] }[]][];
    const roles: Record<string, { id: string }> = {};
    for (const [key, grants] of entries) {
      const role = await this.prisma.role.create({
        data: {
          organizationId,
          key: key as RoleKey,
          name: key
            .split('_')
            .map((w) => w[0] + w.slice(1).toLowerCase())
            .join(' '),
          description: `Default ${key.replace(/_/g, ' ').toLowerCase()} role`,
          isSystem: true,
          permissions: { create: grants.flatMap((g) => Array.from(new Set(g.actions)).map((action) => ({ module: g.module, action }))) },
        },
      });
      roles[key] = { id: role.id };
    }
    return roles;
  }

  list(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async get(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId }, include: { permissions: true } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(organizationId: string, dto: UpsertRoleDto) {
    this.validateModules(dto);
    return this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        key: RoleKey.CUSTOM,
        permissions: { create: dto.permissions.flatMap((g) => Array.from(new Set(g.actions)).map((action) => ({ module: g.module, action }))) },
      },
      include: { permissions: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpsertRoleDto) {
    this.validateModules(dto);
    const role = await this.get(organizationId, id);
    if (role.isSystem && role.key === RoleKey.SUPER_ADMIN) {
      throw new BadRequestException('Super Admin role permissions cannot be modified');
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: { create: dto.permissions.flatMap((g) => Array.from(new Set(g.actions)).map((action) => ({ module: g.module, action }))) },
      },
      include: { permissions: true },
    });
  }

  async remove(organizationId: string, id: string) {
    const role = await this.get(organizationId, id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    const usersOnRole = await this.prisma.user.count({ where: { roleId: id } });
    if (usersOnRole > 0) {
      throw new BadRequestException('Cannot delete a role that is assigned to users');
    }
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  private validateModules(dto: UpsertRoleDto) {
    for (const grant of dto.permissions) {
      if (!MODULES.includes(grant.module as any)) {
        throw new BadRequestException(`Unknown module "${grant.module}"`);
      }
    }
  }
}
