import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(title: string, message: string, recipientId?: string) {
    return this.prisma.notification.create({
      data: {
        title,
        message,
        recipientId,
        read: false,
      },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        OR: [
          { recipientId: userId },
          { recipientId: null }, // Global system notifications
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { recipientId: userId },
          { recipientId: null },
        ],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found.`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        read: false,
      },
      data: { read: true },
    });
  }
}
