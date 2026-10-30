import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateZoneInput {
  name: string;
  region?: string;
  district?: string;
  fee: number;
  isDefault?: boolean;
  branchId?: string;
}

/** TZ 14 — Toshkent shahri 30 000, Samarqand shahri 20 000, boshqa hududlar 40 000 (fallback). */
@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.deliveryZone.findMany({ where: { isActive: true } });
  }

  async computeFee(region: string, district?: string): Promise<{ fee: number; zoneId: string }> {
    const exact = district
      ? await this.prisma.deliveryZone.findFirst({ where: { isActive: true, region, district } })
      : null;
    if (exact) return { fee: exact.fee, zoneId: exact.id };

    const regionMatch = await this.prisma.deliveryZone.findFirst({
      where: { isActive: true, region, district: null },
    });
    if (regionMatch) return { fee: regionMatch.fee, zoneId: regionMatch.id };

    const fallback = await this.prisma.deliveryZone.findFirst({ where: { isActive: true, isDefault: true } });
    if (!fallback) throw new NotFoundException("Yetkazib berish zonasi topilmadi (default zona sozlanmagan)");
    return { fee: fallback.fee, zoneId: fallback.id };
  }

  create(input: CreateZoneInput) {
    return this.prisma.deliveryZone.create({ data: input });
  }

  update(id: string, input: Partial<CreateZoneInput> & { isActive?: boolean }) {
    return this.prisma.deliveryZone.update({ where: { id }, data: input });
  }
}
