import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { LogAdapter } from './adapters/log.adapter';

@Module({
  providers: [NotificationsService, TelegramAdapter, LogAdapter],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
