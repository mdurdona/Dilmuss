import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementReason, Prisma, ProductStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InsufficientStockException } from './inventory.errors';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * #11 audit eslatmasi: bu servis o'zi HECH QANDAY branch-access yoki RBAC tekshiruvi qilmaydi —
 * chaqiruvchi (controller yoki boshqa servis) `branchId` ustidan `BranchAccessService` orqali
 * ruxsatni OLDINDAN tekshirgan bo'lishi kerak. Hozirgi chaqiruvchilar (InventoryController.adjust,
 * StockTransferService.ship/receive, OrdersService — checkout/assignBranch/updateStatus) buni
 * to'g'ri bajaradi; yangi chaqiruvchi qo'shilganda ham shu shartga rioya qilinishi shart.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filialda hali BranchInventory yozuvi yo'q variantlar ham (onHand=0 bilan) chiqadi —
   * aks holda yangi filialda zaxira birinchi marta qo'shish uchun jadvalda joy bo'lmas edi.
   */
  async listByBranch(branchId: string) {
    const [variants, existing] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { isActive: true, product: { status: ProductStatus.ACTIVE } },
        include: { product: true },
        orderBy: [{ product: { name: 'asc' } }, { color: 'asc' }, { size: 'asc' }],
      }),
      this.prisma.branchInventory.findMany({ where: { branchId } }),
    ]);
    const byVariant = new Map(existing.map((e) => [e.variantId, e]));

    return variants.map((variant) => {
      const inv = byVariant.get(variant.id);
      return {
        id: inv?.id ?? variant.id,
        branchId,
        variantId: variant.id,
        onHand: inv?.onHand ?? 0,
        reserved: inv?.reserved ?? 0,
        lowStockThreshold: inv?.lowStockThreshold ?? 3,
        variant,
      };
    });
  }

  listByVariant(variantId: string) {
    return this.prisma.branchInventory.findMany({
      where: { variantId },
      include: { branch: true },
    });
  }

  async getAvailability(branchId: string, variantId: string) {
    const row = await this.prisma.branchInventory.findUnique({
      where: { branchId_variantId: { branchId, variantId } },
    });
    if (!row) return { onHand: 0, reserved: 0, available: 0 };
    return { onHand: row.onHand, reserved: row.reserved, available: row.onHand - row.reserved };
  }

  /** Har qanday branch bo'yicha eng ko'p available'ga ega filialni topadi (checkout uchun). */
  async findBestBranchForVariant(variantId: string, quantity: number, client: Client = this.prisma) {
    const rows = await client.branchInventory.findMany({
      where: { variantId, branch: { isActive: true } },
    });
    return rows.find((row) => row.onHand - row.reserved >= quantity) ?? null;
  }

  /** TZ 11.3 — MVP: bitta order = bitta filial. Barcha item birga mavjud bo'lgan filialni qaytaradi, aks holda null. */
  async findBranchForCart(items: { variantId: string; quantity: number }[]): Promise<string | null> {
    const variantIds = items.map((item) => item.variantId);
    const rows = await this.prisma.branchInventory.findMany({
      where: { variantId: { in: variantIds }, branch: { isActive: true } },
    });

    const byBranch = new Map<string, Map<string, { onHand: number; reserved: number }>>();
    for (const row of rows) {
      if (!byBranch.has(row.branchId)) byBranch.set(row.branchId, new Map());
      byBranch.get(row.branchId)!.set(row.variantId, { onHand: row.onHand, reserved: row.reserved });
    }

    for (const [branchId, inventoryByVariant] of byBranch) {
      const satisfiesAll = items.every((item) => {
        const record = inventoryByVariant.get(item.variantId);
        return record && record.onHand - record.reserved >= item.quantity;
      });
      if (satisfiesAll) return branchId;
    }
    return null;
  }

  private async lockRow(client: Prisma.TransactionClient, branchId: string, variantId: string) {
    const rows = await client.$queryRaw<{ id: string; onHand: number; reserved: number }[]>`
      SELECT id, "onHand", "reserved" FROM "BranchInventory"
      WHERE "branchId" = ${branchId} AND "variantId" = ${variantId}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  /** TZ 13.4 — onHand o'zgarishi doim InventoryMovement'ga yoziladi. Invariant: onHand >= 0. */
  async adjustOnHand(
    params: {
      branchId: string;
      variantId: string;
      delta: number;
      reason: InventoryMovementReason;
      userId?: string;
      note?: string;
      orderId?: string;
      transferId?: string;
    },
    client: Client = this.prisma,
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      let inventory = await tx.branchInventory.findUnique({
        where: { branchId_variantId: { branchId: params.branchId, variantId: params.variantId } },
      });
      if (!inventory) {
        inventory = await tx.branchInventory.create({
          data: { branchId: params.branchId, variantId: params.variantId, onHand: 0, reserved: 0 },
        });
      }

      const locked = await this.lockRow(tx, params.branchId, params.variantId);
      if (!locked) throw new NotFoundException('Ombor yozuvi topilmadi');

      const newOnHand = locked.onHand + params.delta;
      if (newOnHand < 0) throw new InsufficientStockException(params.variantId, params.branchId);
      // Invariant: reserved <= onHand. Faqat consume() bu ikkalasini birga kamaytiradi;
      // qo'lda tuzatish (delta < 0) reserved'ni buzmasligi kerak.
      if (params.delta < 0 && newOnHand < locked.reserved) {
        throw new BadRequestException(
          `Filialda (${params.branchId}) variant (${params.variantId}) uchun ${locked.reserved} dona band qilingan — onHand'ni shu miqdordan pastga tushirib bo'lmaydi`,
        );
      }

      await tx.branchInventory.update({
        where: { id: locked.id },
        data: { onHand: newOnHand },
      });

      await tx.inventoryMovement.create({
        data: {
          branchId: params.branchId,
          variantId: params.variantId,
          oldOnHand: locked.onHand,
          newOnHand,
          change: params.delta,
          reason: params.reason,
          note: params.note,
          userId: params.userId,
          orderId: params.orderId,
          transferId: params.transferId,
        },
      });

      return { onHand: newOnHand, reserved: locked.reserved };
    };

    if ('$transaction' in client) return client.$transaction((tx) => run(tx));
    return run(client);
  }

  /** TZ 13.2 — checkout rezervi: reserved += quantity, faqat available yetarli bo'lsa. */
  async reserve(
    params: { branchId: string; variantId: string; quantity: number; orderItemId: string; ttlMinutes: number },
    client: Client = this.prisma,
  ) {
    const run = async (tx: Prisma.TransactionClient) => {
      const locked = await this.lockRow(tx, params.branchId, params.variantId);
      if (!locked || locked.onHand - locked.reserved < params.quantity) {
        throw new InsufficientStockException(params.variantId, params.branchId);
      }

      await tx.branchInventory.update({
        where: { id: locked.id },
        data: { reserved: { increment: params.quantity } },
      });

      return tx.stockReservation.create({
        data: {
          orderItemId: params.orderItemId,
          branchId: params.branchId,
          variantId: params.variantId,
          quantity: params.quantity,
          status: ReservationStatus.ACTIVE,
          expiresAt: new Date(Date.now() + params.ttlMinutes * 60 * 1000),
        },
      });
    };

    if ('$transaction' in client) return client.$transaction((tx) => run(tx));
    return run(client);
  }

  private async closeReservation(
    reservationId: string,
    status: typeof ReservationStatus.RELEASED | typeof ReservationStatus.EXPIRED,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({ where: { id: reservationId } });
      if (!reservation || reservation.status !== ReservationStatus.ACTIVE) return reservation;

      await tx.branchInventory.updateMany({
        where: { branchId: reservation.branchId, variantId: reservation.variantId },
        data: { reserved: { decrement: reservation.quantity } },
      });

      return tx.stockReservation.update({
        where: { id: reservationId },
        data: { status, releasedAt: new Date() },
      });
    });
  }

  release(reservationId: string) {
    return this.closeReservation(reservationId, ReservationStatus.RELEASED);
  }

  /** To'lov tasdiqlangach: reserved kamayadi VA onHand haqiqiy sotilgan miqdorga kamayadi. */
  /** To'lov tasdiqlash oqimining bir qismi bo'lishi mumkin — shuning uchun tashqi tx qabul qiladi (bitta atomik operatsiya uchun). */
  async consume(reservationId: string, userId?: string, client: Client = this.prisma) {
    const run = async (tx: Prisma.TransactionClient) => {
      const reservation = await tx.stockReservation.findUnique({
        where: { id: reservationId },
        include: { orderItem: true },
      });
      if (!reservation || reservation.status !== ReservationStatus.ACTIVE) return reservation;

      const locked = await this.lockRow(tx, reservation.branchId, reservation.variantId);
      if (!locked) throw new NotFoundException('Ombor yozuvi topilmadi');

      const newOnHand = locked.onHand - reservation.quantity;
      await tx.branchInventory.update({
        where: { id: locked.id },
        data: { onHand: newOnHand, reserved: { decrement: reservation.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          branchId: reservation.branchId,
          variantId: reservation.variantId,
          oldOnHand: locked.onHand,
          newOnHand,
          change: -reservation.quantity,
          reason: InventoryMovementReason.ORDER_SALE,
          userId,
          orderId: reservation.orderItem.orderId,
        },
      });

      return tx.stockReservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CONSUMED },
      });
    };

    if ('$transaction' in client) return client.$transaction((tx) => run(tx));
    return run(client);
  }

  /** TZ 13.2 — cron: muddati o'tgan ACTIVE rezervlarni bo'shatadi (default 15 daqiqa, SystemSetting'dan). */
  async expireDueReservations() {
    const due = await this.prisma.stockReservation.findMany({
      where: { status: ReservationStatus.ACTIVE, expiresAt: { lt: new Date() } },
    });
    for (const reservation of due) {
      await this.closeReservation(reservation.id, ReservationStatus.EXPIRED);
    }
    return due.length;
  }
}
