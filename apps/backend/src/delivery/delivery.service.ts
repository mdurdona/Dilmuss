import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BranchAccessService } from '../branches/branch-access.service';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  createForOrder(orderId: string, zoneId: string, fee: number) {
    return this.prisma.delivery.create({ data: { orderId, zoneId, fee } });
  }

  findByOrder(orderId: string) {
    return this.prisma.delivery.findUnique({ where: { orderId } });
  }

  /** DELIVERY_VIEW o'zi "yetkazib berishlarni ko'rish mumkinmi" degani — QAYSI filialnikini
   * ko'rish mumkinligini alohida cheklaymiz (#7 audit: permission != branch access). */
  async list(params: { branchId?: string; status?: DeliveryStatus }, actor: RequestUser) {
    const accessible = await this.branchAccessService.getAccessibleBranchIds(actor);

    let orderBranchWhere: Prisma.OrderWhereInput | undefined;
    if (params.branchId) {
      if (accessible !== 'ALL' && !accessible.includes(params.branchId)) {
        throw new ForbiddenException("Bu filialga ruxsatingiz yo'q");
      }
      orderBranchWhere = { branchId: params.branchId };
    } else if (accessible !== 'ALL') {
      orderBranchWhere = { branchId: { in: accessible.length ? accessible : ['__none__'] } };
    }

    return this.prisma.delivery.findMany({
      where: { status: params.status, order: orderBranchWhere },
      include: { order: true, zone: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: DeliveryStatus,
    extra?: { courierName?: string; courierPhone?: string; trackingNumber?: string; note?: string },
    actor?: RequestUser,
  ) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id }, include: { order: true } });
    if (!delivery) throw new NotFoundException('Yetkazib berish topilmadi');

    // `actor` faqat tashqi (controller) chaqiruvda beriladi — OrdersService o'zining allaqachon
    // branch-tekshirilgan updateStatus() ichidan chaqirganda actor kerak emas.
    if (actor && delivery.order.branchId) {
      const allowed = await this.branchAccessService.assertBranchAccess(actor, delivery.order.branchId);
      if (!allowed) throw new ForbiddenException("Bu filialga ruxsatingiz yo'q");
    }

    return this.prisma.delivery.update({
      where: { id },
      data: {
        status,
        ...extra,
        shippedAt: status === DeliveryStatus.IN_TRANSIT ? new Date() : undefined,
        deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : undefined,
      },
    });
  }
}
