import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { createRedisConnection } from './common/redis-connection';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { DesignationsModule } from './designations/designations.module';
import { LocationsModule } from './locations/locations.module';
import { OrgStructureModule } from './org-structure/org-structure.module';
import { DocumentsModule } from './documents/documents.module';
import { LeaveModule } from './leave/leave.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ReportsModule } from './reports/reports.module';
import { ExportsModule } from './exports/exports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ connection: createRedisConnection(config) }),
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,
    EmployeesModule,
    DepartmentsModule,
    DesignationsModule,
    LocationsModule,
    OrgStructureModule,
    DocumentsModule,
    LeaveModule,
    AttendanceModule,
    ReportsModule,
    ExportsModule,
    NotificationsModule,
    AuditLogsModule,
    JobsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
