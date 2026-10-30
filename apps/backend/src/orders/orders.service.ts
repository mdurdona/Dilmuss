import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  DeliveryStatus,
  InventoryMovementReason,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { DeliveryZonesService } from '../delivery/delivery-zones.service';
import { DeliveryService } from '../delivery/delivery.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { BranchAccessService } from '../branches/branch-access.service';
import { CheckoutDto } from './dto/checkout.dto';
import { applyDiscount, resolveVariantPrice } from '../common/utils/pricing';
import { formatProductCode, generateOrderNumber } from '../common/utils/format';
import type { RequestUser } from '../common/types/request-user';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.MANUAL_REVIEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly deliveryZonesService: DeliveryZonesService,
    private readonly deliveryService: DeliveryService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private async uniqueOrderNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = generateOrderNumber();
      const existing = await this.prisma.order.findUnique({ where: { orderNumber: candidate } });
      if (!existing) return candidate;
    }
    throw new Error("Buyurtma raqamini generatsiya qilib bo'lmadi");
  }

  /** TZ 11 — checkout: cart -> Order, bitta filial tanlanadi yoki MANUAL_REVIEW, stock rezervlanadi. */
  async checkout(userId: string | null, guestToken: string | null, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cartId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException("Savat bo'sh yoki topilmadi");

    // Ownership: ro'yxatdan o'tgan foydalanuvchi faqat o'z savatini, mehmon faqat o'z guest cookie'siga
    // bog'langan savatni checkout qila oladi — cartId'ni to'g'ridan-to'g'ri ishonib bo'lmaydi.
    const cartBelongsToRequester = userId ? cart.userId === userId : cart.guestToken !== null && cart.guestToken === guestToken;
    if (!cartBelongsToRequester) throw new ForbiddenException('Bu savat sizga tegishli emas');

    let addressId = dto.addressId;
    let addressRegion: string;
    let addressDistrict: string;
    if (!addressId) {
      if (!dto.newAddress) throw new BadRequestException('Manzil kerak');
      const address = await this.prisma.address.create({
        data: { ...dto.newAddress, userId },
      });
      addressId = address.id;
      addressRegion = address.region;
      addressDistrict = address.district;
    } else {
      // Saqlangan manzilni faqat egasi qayta ishlatishi mumkin — mehmonlar bu yo'lni ishlata olmaydi.
      const address = await this.prisma.address.findUnique({ where: { id: addressId } });
      if (!address) throw new NotFoundException('Manzil topilmadi');
      if (!userId || address.userId !== userId) throw new ForbiddenException('Bu manzil sizga tegishli emas');
      addressRegion = address.region;
      addressDistrict = address.district;
    }

    const items = cart.items.map((item) => {
      const originalPrice = resolveVariantPrice(item.variant.product, item.variant);
      const productDiscounted = applyDiscount(originalPrice, item.variant.product);
      const actualPrice = applyDiscount(productDiscounted, item.variant);
      return {
        variantId: item.variantId,
        productId: item.variant.productId,
        quantity: item.quantity,
        originalPrice,
        actualPrice,
        productCode: item.variant.product.productCode,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        color: item.variant.color,
        size: item.variant.size,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.actualPrice * item.quantity, 0);
    const discountTotal = subtotal - total;

    const { fee: deliveryFee, zoneId } = await this.deliveryZonesService.computeFee(addressRegion, addressDistrict);
    const branchId = await this.inventoryService.findBranchForCart(
      items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    );
    const orderNumber = await this.uniqueOrderNumber();
    const ttlMinutes = await this.settingsService.getStockReservationTtlMinutes();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          status: branchId ? OrderStatus.PENDING_PAYMENT : OrderStatus.MANUAL_REVIEW,
          source: dto.source,
          utmSource: dto.utmSource,
          utmCampaign: dto.utmCampaign,
          utmContent: dto.utmContent,
          subtotal,
          discountTotal,
          deliveryFee: deliveryFee,
          total: total + deliveryFee,
          branchId,
          addressId,
          items: { create: items },
        },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: created.id, toStatus: created.status },
      });

      if (branchId) {
        for (const item of created.items) {
          await this.inventoryService.reserve(
            {
              branchId,
              variantId: item.variantId,
              quantity: item.quantity,
              orderItemId: item.id,
              ttlMinutes,
            },
            tx,
          );
        }
      }

      await tx.delivery.create({ data: { orderId: created.id, zoneId, fee: deliveryFee } });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    await this.notificationsService.notify({
      type: NotificationType.NEW_ORDER,
      orderId: order.id,
      branchId: order.branchId ?? undefined,
      message: `Yangi buyurtma #${order.orderNumber} — ${order.total.toLocaleString('uz-UZ')} so'm${
        !branchId ? " (MANUAL_REVIEW: filial tanlanmadi)" : ''
      }`,
    });

    return this.findOne(order.id);
  }

  findOne(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        items: true,
        address: true,
        branch: true,
        delivery: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findByTracking(orderNumber: string, customerPhone: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, customerPhone },
      include: { items: true, delivery: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, delivery: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForAdmin(user: RequestUser, filters: { status?: OrderStatus; paymentStatus?: PaymentStatus }) {
    const accessible = await this.branchAccessService.getAccessibleBranchIds(user);
    const where: Prisma.OrderWhereInput = {
      status: filters.status,
      paymentStatus: filters.paymentStatus,
      branchId: accessible === 'ALL' ? undefined : { in: accessible.length ? accessible : ['__none__'] },
    };
    return this.prisma.order.findMany({
      where,
      include: { items: true, branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** MANUAL_REVIEW holatidagi orderni admin qo'lda filialga biriktiradi va stock rezervlaydi. */
  async assignBranch(orderId: string, branchId: string, actor: RequestUser) {
    const hasBranchAccess = await this.branchAccessService.assertBranchAccess(actor, branchId);
    if (!hasBranchAccess) throw new ForbiddenException('Bu filialga ruxsatingiz yo\'q');

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status !== OrderStatus.MANUAL_REVIEW) {
      throw new BadRequestException('Faqat MANUAL_REVIEW holatidagi buyurtmaga filial biriktirish mumkin');
    }

    const ttlMinutes = await this.settingsService.getStockReservationTtlMinutes();
    for (const item of order.items) {
      const availability = await this.inventoryService.getAvailability(branchId, item.variantId);
      if (availability.available < item.quantity) {
        throw new BadRequestException(`Filialda "${item.productName}" (${item.color}/${item.size}) uchun zaxira yetarli emas`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await this.inventoryService.reserve(
          { branchId, variantId: item.variantId, quantity: item.quantity, orderItemId: item.id, ttlMinutes },
          tx,
        );
      }
      const updated = await tx.order.update({ where: { id: orderId }, data: { branchId, status: OrderStatus.CONFIRMED } });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: OrderStatus.MANUAL_REVIEW, toStatus: OrderStatus.CONFIRMED, changedById: actor.id },
      });
      return updated;
    });
  }

  async updateStatus(orderId: string, toStatus: OrderStatus, actor: RequestUser, note?: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { reservation: true } }, delivery: true } });

    // Mijoz faqat o'z buyurtmasini bekor qiladi (controller'da assertOwnership orqali tekshirilgan) —
    // branch scoping faqat xodimlar (ADMIN/SUPERADMIN) uchun ma'noli.
    if (actor.role !== UserRole.CUSTOMER && order.branchId) {
      const hasBranchAccess = await this.branchAccessService.assertBranchAccess(actor, order.branchId);
      if (!hasBranchAccess) throw new ForbiddenException('Bu filialga ruxsatingiz yo\'q');
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(`${order.status} holatidan ${toStatus} holatiga o'tish mumkin emas`);
    }

    if (toStatus === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        if (item.reservation && item.reservation.status === ReservationStatus.ACTIVE) {
          await this.inventoryService.release(item.reservation.id);
        } else if (item.reservation && item.reservation.status === ReservationStatus.CONSUMED) {
          await this.inventoryService.adjustOnHand({
            branchId: item.reservation.branchId,
            variantId: item.variantId,
            delta: item.quantity,
            reason: InventoryMovementReason.ORDER_CANCEL_RESTOCK,
            userId: actor.id,
            orderId,
          });
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          cancelledAt: toStatus === OrderStatus.CANCELLED ? new Date() : undefined,
          cancelReason: toStatus === OrderStatus.CANCELLED ? note : undefined,
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus, changedById: actor.id, note },
      });
      return result;
    });

    if (order.delivery && toStatus === OrderStatus.SHIPPED) {
      await this.deliveryService.updateStatus(order.delivery.id, DeliveryStatus.IN_TRANSIT);
    }
    if (order.delivery && toStatus === OrderStatus.DELIVERED) {
      await this.deliveryService.updateStatus(order.delivery.id, DeliveryStatus.DELIVERED);
    }

    await this.notificationsService.notify({
      type: NotificationType.ORDER_STATUS_CHANGED,
      orderId,
      recipient: order.customerPhone,
      message: `Buyurtma #${order.orderNumber} holati: ${toStatus}`,
    });

    await this.auditService.record({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'Order',
      entityId: orderId,
      oldValue: { status: order.status },
      newValue: { status: toStatus },
      branchId: order.branchId,
    });

    return updated;
  }

  /**
   * PaymentsService to'lov muvaffaqiyatli bo'lganda chaqiradi: rezerv consume qilinadi, order CONFIRMED bo'ladi.
   * `tx` berilsa (PaymentsService'dan), payment.update + bu butun operatsiya bitta atomik transactionga birlashadi —
   * shunda "Payment=PAID lekin Order=PENDING_PAYMENT" kabi inconsistent holat yuzaga kelmaydi.
   */
  async markPaid(orderId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const order = await client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { reservation: true } } },
    });

    const run = async (txClient: Prisma.TransactionClient) => {
      for (const item of order.items) {
        if (item.reservation && item.reservation.status === ReservationStatus.ACTIVE) {
          await this.inventoryService.consume(item.reservation.id, undefined, txClient);
        }
      }

      const result = await txClient.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date(), status: OrderStatus.CONFIRMED },
      });

      await txClient.orderStatusHistory.create({
        data: { orderId, fromStatus: order.status, toStatus: OrderStatus.CONFIRMED, note: "To'lov tasdiqlandi" },
      });

      return result;
    };

    const updated = tx ? await run(tx) : await this.prisma.$transaction((txInner) => run(txInner));

    await this.notificationsService.notify({
      type: NotificationType.PAYMENT_RECEIVED,
      orderId,
      branchId: order.branchId ?? undefined,
      message: `Buyurtma #${order.orderNumber} uchun to'lov qabul qilindi`,
    });

    return updated;
  }

  async assertOwnership(orderId: string, user: RequestUser) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.userId && order.userId !== user.id) throw new ForbiddenException("Bu buyurtma sizga tegishli emas");
    return order;
  }

  /** Admin bu orderning filialiga kira oladimi — ORDER_VIEW ruxsati yetarli emas, branch scope ham tekshiriladi. */
  async assertBranchAccessForAdmin(orderId: string, user: RequestUser) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.branchId) {
      const hasBranchAccess = await this.branchAccessService.assertBranchAccess(user, order.branchId);
      if (!hasBranchAccess) throw new ForbiddenException('Bu filialga ruxsatingiz yo\'q');
    }
    return order;
  }
}
