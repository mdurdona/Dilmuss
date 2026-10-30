import { ForbiddenException } from '@nestjs/common';
import { BranchScope } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { BranchAccessService } from '../branches/branch-access.service';
import { StockTransferService } from './stock-transfer.service';

describe('StockTransferService — security fix #7: filiallar orasidagi transfer branch authorization', () => {
  const ctx = new TestContext();
  const prisma: PrismaService = ctx.prisma;
  const branchAccessService = new BranchAccessService(prisma);
  const inventoryService = new InventoryService(prisma);
  const stockTransferService = new StockTransferService(prisma, inventoryService, branchAccessService);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("na manba, na maqsad filialga aloqasi bo'lmagan admin transfer so'ray olmaydi", async () => {
    const branchX = await ctx.makeBranch();
    const branchY = await ctx.makeBranch();
    const branchZ = await ctx.makeBranch(); // adminning o'z filiali — na X, na Y
    const adminZ = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchZ.id });
    const variant = await ctx.makeVariant();

    await expect(
      stockTransferService.request(branchX.id, branchY.id, [{ variantId: variant.id, quantity: 5 }], adminZ.id, undefined, adminZ as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it("maqsad filialiga (o'ziniki) kiruvchi transfer so'rovi ruxsat etiladi, garchi manba filiali unga tegishli bo'lmasa ham", async () => {
    const branchSource = await ctx.makeBranch();
    const branchDest = await ctx.makeBranch();
    const adminDest = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchDest.id });
    const variant = await ctx.makeVariant();

    const transfer = await stockTransferService.request(
      branchSource.id,
      branchDest.id,
      [{ variantId: variant.id, quantity: 3 }],
      adminDest.id,
      undefined,
      adminDest as any,
    );
    ctx.trackStockTransfer(transfer.id);
    expect(transfer.fromBranchId).toBe(branchSource.id);
    expect(transfer.toBranchId).toBe(branchDest.id);
  });

  it("approve — faqat manba filial adminigagina ruxsat berilgan", async () => {
    const branchSource = await ctx.makeBranch();
    const branchDest = await ctx.makeBranch();
    const adminDest = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchDest.id });
    const variant = await ctx.makeVariant();
    const transfer = await ctx.makeStockTransfer({
      fromBranchId: branchSource.id,
      toBranchId: branchDest.id,
      requestedById: adminDest.id,
      variantId: variant.id,
      quantity: 2,
    });

    // Maqsad filial admini manba filialni tasdiqlay olmasligi kerak — bu manba filialning ishi.
    await expect(stockTransferService.approve(transfer.id, adminDest.id, adminDest as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("ship — faqat manba filialga ruxsati bor admin jo'nata oladi", async () => {
    const branchSource = await ctx.makeBranch();
    const branchDest = await ctx.makeBranch();
    const adminSource = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchSource.id });
    const variant = await ctx.makeVariant();
    await ctx.seedInventory(branchSource.id, variant.id, 10, 0);

    const transfer = await ctx.makeStockTransfer({
      fromBranchId: branchSource.id,
      toBranchId: branchDest.id,
      requestedById: adminSource.id,
      variantId: variant.id,
      quantity: 4,
      status: 'APPROVED',
    });

    const shipped = await stockTransferService.ship(transfer.id, adminSource as any);
    expect(shipped.status).toBe('IN_TRANSIT');

    const inv = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_variantId: { branchId: branchSource.id, variantId: variant.id } },
    });
    expect(inv.onHand).toBe(6); // 10 - 4
  });

  it("receive — manba filial admini qabul qila olmaydi (faqat maqsad filial)", async () => {
    const branchSource = await ctx.makeBranch();
    const branchDest = await ctx.makeBranch();
    const adminSource = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchSource.id });
    const variant = await ctx.makeVariant();

    const transfer = await ctx.makeStockTransfer({
      fromBranchId: branchSource.id,
      toBranchId: branchDest.id,
      requestedById: adminSource.id,
      variantId: variant.id,
      quantity: 2,
      status: 'IN_TRANSIT',
    });

    await expect(stockTransferService.receive(transfer.id, adminSource.id, adminSource as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("list — branchId berilmasa, faqat o'zi kirisha oladigan filiallar bilan bog'liq transferlar qaytadi", async () => {
    const branchX = await ctx.makeBranch();
    const branchOther1 = await ctx.makeBranch();
    const branchOther2 = await ctx.makeBranch();
    const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });
    const variant = await ctx.makeVariant();

    const relevant = await ctx.makeStockTransfer({
      fromBranchId: branchX.id,
      toBranchId: branchOther1.id,
      requestedById: adminX.id,
      variantId: variant.id,
      quantity: 1,
    });
    const irrelevant = await ctx.makeStockTransfer({
      fromBranchId: branchOther1.id,
      toBranchId: branchOther2.id,
      requestedById: adminX.id,
      variantId: variant.id,
      quantity: 1,
    });

    const results = await stockTransferService.list(undefined, adminX as any);
    const ids = results.map((t) => t.id);
    expect(ids).toContain(relevant.id);
    expect(ids).not.toContain(irrelevant.id);
  });
});
