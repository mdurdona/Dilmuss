import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BranchScope, InventoryMovementReason } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { buildServices } from '../test/service-builders';

describe('Inventory — security fixes (#2 branch authorization, #4 reserved<=onHand invariant)', () => {
  const ctx = new TestContext();
  const { inventoryService, inventoryController } = buildServices(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('#4 adjustOnHand() — reserved <= onHand invarianti', () => {
    it('onHand=10, reserved=8, delta=-3 => rad etiladi (newOnHand 7 < reserved 8)', async () => {
      const branch = await ctx.makeBranch();
      const variant = await ctx.makeVariant();
      await ctx.seedInventory(branch.id, variant.id, 10, 8);

      await expect(
        inventoryService.adjustOnHand({
          branchId: branch.id,
          variantId: variant.id,
          delta: -3,
          reason: InventoryMovementReason.MANUAL_ADJUSTMENT,
        }),
      ).rejects.toThrow(BadRequestException);

      const row = await ctx.prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_variantId: { branchId: branch.id, variantId: variant.id } },
      });
      expect(row.onHand).toBe(10); // o'zgarmagan bo'lishi kerak
    });

    it('onHand=10, reserved=8, delta=-2 => ruxsat etiladi (chegara: newOnHand 8 == reserved 8)', async () => {
      const branch = await ctx.makeBranch();
      const variant = await ctx.makeVariant();
      await ctx.seedInventory(branch.id, variant.id, 10, 8);

      const result = await inventoryService.adjustOnHand({
        branchId: branch.id,
        variantId: variant.id,
        delta: -2,
        reason: InventoryMovementReason.MANUAL_ADJUSTMENT,
      });

      expect(result.onHand).toBe(8);
    });
  });

  describe('#2 InventoryController — branch authorization', () => {
    it('OWN_BRANCH admin boshqa filialga stock adjust qila olmaydi', async () => {
      const branchX = await ctx.makeBranch();
      const branchY = await ctx.makeBranch();
      const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });
      const variant = await ctx.makeVariant();
      await ctx.seedInventory(branchY.id, variant.id, 10, 0);

      await expect(
        inventoryController.adjust(
          { branchId: branchY.id, variantId: variant.id, delta: 5, reason: InventoryMovementReason.MANUAL_ADJUSTMENT } as any,
          adminX as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("SELECTED_BRANCHES admin tanlanmagan filialga kira olmaydi, tanlanganiga kira oladi", async () => {
      const branchX = await ctx.makeBranch();
      const branchY = await ctx.makeBranch();
      const branchZ = await ctx.makeBranch();
      const adminXY = await ctx.makeAdmin({ branchScope: BranchScope.SELECTED_BRANCHES, branchIds: [branchX.id, branchY.id] });
      const variant = await ctx.makeVariant();
      await ctx.seedInventory(branchZ.id, variant.id, 10, 0);
      await ctx.seedInventory(branchX.id, variant.id, 10, 0);

      await expect(
        inventoryController.listByBranch(branchZ.id, adminXY as any),
      ).rejects.toThrow(ForbiddenException);

      await expect(inventoryController.listByBranch(branchX.id, adminXY as any)).resolves.toBeDefined();
    });

    it("listByVariant faqat accessible filiallar qatorlarini qaytaradi", async () => {
      const branchX = await ctx.makeBranch();
      const branchY = await ctx.makeBranch();
      const adminXOnly = await ctx.makeAdmin({ branchScope: BranchScope.SELECTED_BRANCHES, branchIds: [branchX.id] });
      const variant = await ctx.makeVariant();
      await ctx.seedInventory(branchX.id, variant.id, 5, 0);
      await ctx.seedInventory(branchY.id, variant.id, 7, 0);

      const rows = await inventoryController.listByVariant(variant.id, adminXOnly as any);
      const branchIds = rows.map((r: any) => r.branchId);
      expect(branchIds).toContain(branchX.id);
      expect(branchIds).not.toContain(branchY.id);
    });
  });
});
