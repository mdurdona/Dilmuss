import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationAdapter } from './notification-adapter.interface';

/** TZ 20.1 — Telegram bot orqali admin/mijozga xabar. Token yo'q bo'lsa faqat log qiladi (dev fallback). */
@Injectable()
export class TelegramAdapter implements NotificationAdapter {
  private readonly logger = new Logger(TelegramAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async send(recipient: string | null, message: string, _payload?: unknown): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = recipient ?? this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID');

    if (!token || !chatId) {
      this.logger.warn(`[dev-only] Telegram xabari yuborilmadi (token/chatId yo'q): ${message}`);
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API xatosi: ${response.status} ${body}`);
    }
  }
}
