import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveBalancesService } from '../leave/leave-balances.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalances: LeaveBalancesService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async runMonthlyLeaveAccrual() {
    const organizations = await this.prisma.organization.findMany({ select: { id: true } });
    for (const org of organizations) {
      const result = await this.leaveBalances.runAccrual(org.id);
      this.logger.log(`Accrual for org ${org.id}: ${result.processed} balances updated`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDocumentExpiryReminders() {
    const to = new Date(Date.now() + 30 * 86400000);
    const documents = await this.prisma.employeeDocument.findMany({
      where: { expiryDate: { not: null, gte: new Date(), lte: to } },
      include: { employee: true },
    });

    for (const doc of documents) {
      const hrUsers = await this.prisma.user.findMany({ where: { organizationId: doc.organizationId, role: { key: 'HR_ADMIN' } } });
      for (const hrUser of hrUsers) {
        await this.notifications.notify({
          organizationId: doc.organizationId,
          userId: hrUser.id,
          type: 'DOCUMENT_EXPIRY',
          title: 'Document expiring soon',
          message: `${doc.employee.firstName} ${doc.employee.lastName}'s ${doc.type} expires on ${doc.expiryDate?.toISOString().slice(0, 10)}.`,
          email: hrUser.email,
        });
      }
    }
  }
}
