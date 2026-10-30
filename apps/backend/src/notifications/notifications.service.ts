import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { LogAdapter } from './adapters/log.adapter';

interface NotifyParams {
  type: NotificationType;
  channel?: NotificationChannel;
  branchId?: string;
  orderId?: string;
  recipient?: string;
  message: string;
  payload?: Prisma.InputJsonValue;
}

/** TZ 20.1 — NotificationService markazlashgan yuboruvchi, kanalga qarab adapterga yo'naltiradi. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly logAdapter: LogAdapter,
  ) {}

  private getAdapter(channel: NotificationChannel) {
    return channel === NotificationChannel.TELEGRAM ? this.telegramAdapter : this.logAdapter;
  }

  async notify(params: NotifyParams) {
    const channel = params.channel ?? NotificationChannel.TELEGRAM;
    const notification = await this.prisma.notification.create({
      data: {
        type: params.type,
        channel,
        branchId: params.branchId,
        orderId: params.orderId,
        recipient: params.recipient,
        message: params.message,
        payload: params.payload,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      await this.getAdapter(channel).send(params.recipient ?? null, params.message, params.payload);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date(), attempts: { increment: 1 } },
      });
    } catch (error) {
      this.logger.error(`Notification yuborishda xato: ${(error as Error).message}`);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          lastError: (error as Error).message,
          attempts: { increment: 1 },
        },
      });
    }

    return notification;
  }

  list(params: { status?: NotificationStatus; type?: NotificationType; take?: number }) {
    return this.prisma.notification.findMany({
      where: { status: params.status, type: params.type },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
    });
  }
}
