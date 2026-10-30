import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementReason, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { BranchAccessService } from '../branches/branch-access.service';
import type { RequestUser } from '../common/types/request-user';

interface TransferItemInput {
  variantId: string;
  quantity: number;
}

/** TZ 13.5 — filiallar orasida ombor ko'chirish (Phase 2), soddalashtirilgan lifecycle. */
@Injectable()
export class StockTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly branchAccessService: BranchAccessService,
  ) {}

  private async assertAccess(actor: RequestUser, branchId: string) {
    const allowed = await this.branchAccessService.assertBranchAccess(actor, branchId);
    if (!allowed) throw new ForbiddenException("Bu filialga ruxsatingiz yo'q");
  }

  /** Transfer ikki tomonlama (from/to) — kamida bittasiga kirish huquqi bo'lishi kerak, aks holda
   * actor ikkala tomoniga ham aloqasi yo'q transferni ko'rmasligi/boshqarmasligi kerak. */
  private async assertEitherSideAccess(actor: RequestUser, fromBranchId: string, toBranchId: string) {
    const accessible = await this.branchAccessService.getAccessibleBranchIds(actor);
    if (accessible === 'ALL') return;
    if (!accessible.includes(fromBranchId) && !accessible.includes(toBranchId)) {
      throw new ForbiddenException("Bu transferga ruxsatingiz yo'q — na manba, na maqsad filialga kirish huquqingiz yo'q");
    }
  }

  async list(branchId: string | undefined, actor: RequestUser) {
    const accessible = await this.branchAccessService.getAccessibleBranchIds(actor);

    if (branchId) {
      if (accessible !== 'ALL' && !accessible.includes(branchId)) {
        throw new ForbiddenException("Bu filialga ruxsatingiz yo'q");
      }
      return this.prisma.stockTransfer.findMany({
        where: { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] },
        include: { items: true, fromBranch: true, toBranch: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.stockTransfer.findMany({
      where:
        accessible === 'ALL'
          ? undefined
          : { OR: [{ fromBranchId: { in: accessible } }, { toBranchId: { in: accessible } }] },
      include: { items: true, fromBranch: true, toBranch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async request(
    fromBranchId: string,
    toBranchId: string,
    items: TransferItemInput[],
    requestedById: string,
    note: string | undefined,
    actor: RequestUser,
  ) {
    if (fromBranchId === toBranchId) throw new BadRequestException("Manba va maqsad filial bir xil bo'lishi mumkin emas");
    await this.assertEitherSideAccess(actor, fromBranchId, toBranchId);

    return this.prisma.stockTransfer.create({
      data: {
        fromBranchId,
        toBranchId,
        requestedById,
        note,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  private async findOrThrow(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({ where: { id }, include: { items: true } });
    if (!transfer) throw new NotFoundException("Transfer topilmadi");
    return transfer;
  }

  /** Tasdiqlash — manba filial o'z zaxirasini yuborishga rozilik beradi. */
  async approve(id: string, approvedById: string, actor: RequestUser) {
    const transfer = await this.findOrThrow(id);
    await this.assertAccess(actor, transfer.fromBranchId);
    if (transfer.status !== StockTransferStatus.REQUESTED) throw new BadRequestException('Faqat REQUESTED holatidagi transfer tasdiqlanadi');
    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.APPROVED, approvedById, approvedAt: new Date() },
    });
  }

  /** Jo'natish: manba filialdan onHand kamayadi (TRANSFER_OUT), holat IN_TRANSIT. */
  async ship(id: string, actor: RequestUser) {
    const transfer = await this.findOrThrow(id);
    await this.assertAccess(actor, transfer.fromBranchId);
    if (transfer.status !== StockTransferStatus.APPROVED) throw new BadRequestException('Faqat APPROVED holatidagi transfer jo\'natiladi');

    for (const item of transfer.items) {
      await this.inventoryService.adjustOnHand({
        branchId: transfer.fromBranchId,
        variantId: item.variantId,
        delta: -item.quantity,
        reason: InventoryMovementReason.TRANSFER_OUT,
        transferId: transfer.id,
      });
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.IN_TRANSIT, shippedAt: new Date() },
    });
  }

  /** Qabul qilish: maqsad filialda onHand ortadi (TRANSFER_IN), holat RECEIVED. */
  async receive(id: string, receivedById: string, actor: RequestUser) {
    const transfer = await this.findOrThrow(id);
    await this.assertAccess(actor, transfer.toBranchId);
    if (transfer.status !== StockTransferStatus.IN_TRANSIT) throw new BadRequestException('Faqat IN_TRANSIT holatidagi transfer qabul qilinadi');

    for (const item of transfer.items) {
      await this.inventoryService.adjustOnHand({
        branchId: transfer.toBranchId,
        variantId: item.variantId,
        delta: item.quantity,
        reason: InventoryMovementReason.TRANSFER_IN,
        transferId: transfer.id,
        userId: receivedById,
      });
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.RECEIVED, receivedById, receivedAt: new Date() },
    });
  }

  async cancel(id: string, actor: RequestUser) {
    const transfer = await this.findOrThrow(id);
    await this.assertEitherSideAccess(actor, transfer.fromBranchId, transfer.toBranchId);
    if (transfer.status === StockTransferStatus.RECEIVED) throw new BadRequestException('Qabul qilingan transferni bekor qilib bo\'lmaydi');
    return this.prisma.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.CANCELLED, cancelledAt: new Date() },
    });
  }
}
