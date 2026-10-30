import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T = unknown>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }

  async set(key: string, value: Prisma.InputJsonValue, updatedById?: string, description?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedById, description },
      update: { value, updatedById },
    });
  }

  list() {
    return this.prisma.systemSetting.findMany();
  }

  async getStockReservationTtlMinutes(): Promise<number> {
    return this.get<number>('stock.reservation.ttlMinutes', 15);
  }
}
