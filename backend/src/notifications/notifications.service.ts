import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

export interface NotifyInput {
  organizationId: string;
  userId?: string | null;
  employeeId?: string | null;
  type: string;
  title: string;
  message: string;
  email?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async notify(input: NotifyInput) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        employeeId: input.employeeId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });

    if (input.email) {
      await this.mail.send(input.email, input.title, input.message);
    }

    return notification;
  }

  async listForUser(organizationId: string, userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { organizationId, userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(organizationId: string, userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { organizationId, userId, read: false },
      data: { read: true },
    });
  }
}
