import { Injectable, Logger } from '@nestjs/common';
import { NotificationAdapter } from './notification-adapter.interface';

/** Email/SMS/Push uchun placeholder adapter — real provayder ulanmaguncha faqat log qiladi. */
@Injectable()
export class LogAdapter implements NotificationAdapter {
  private readonly logger = new Logger(LogAdapter.name);

  async send(recipient: string | null, message: string, _payload?: unknown): Promise<void> {
    this.logger.log(`[stub] -> ${recipient ?? 'unknown'}: ${message}`);
  }
}
