import { ForbiddenException } from '@nestjs/common';
import { BranchScope } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { buildServices } from '../test/service-builders';

describe('OrdersService — security fixes (#1 checkout ownership, #3 branch authorization)', () => {
  const ctx = new TestContext();
  const { ordersService } = buildServices(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('#1 checkout() — cart va address ownership', () => {
    it('User A cart bilan User B checkout qila olmaydi', async () => {
      const userA = await ctx.makeCustomer();
      const userB = await ctx.makeCustomer();
      const variant = await ctx.makeVariant();
      const cartA = await ctx.makeUserCart(userA.id, variant.id);

      await expect(
        ordersService.checkout(userB.id, null, {
          cartId: cartA.id,
          customerName: 'B',
          customerPhone: '+998900000001',
          newAddress: { recipientName: 'B', phone: '+998900000001', region: 'Toshkent shahri', district: 'Chilonzor' },
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Guest A token bilan Guest B (boshqa token) checkout qila olmaydi', async () => {
      const variant = await ctx.makeVariant();
      const guestTokenA = `guestA-${Date.now()}`;
      const guestTokenB = `guestB-${Date.now()}`;
      const cartA = await ctx.makeGuestCart(guestTokenA, variant.id);

      await expect(
        ordersService.checkout(null, guestTokenB, {
          cartId: cartA.id,
          customerName: 'Guest B',
          customerPhone: '+998900000002',
          newAddress: { recipientName: 'G', phone: '+998900000002', region: 'Toshkent shahri', district: 'Chilonzor' },
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Guest saqlangan addressId'dan foydalana olmaydi", async () => {
      const owner = await ctx.makeCustomer();
      const variant = await ctx.makeVariant();
      const address = await ctx.makeAddress(owner.id);
      const guestToken = `guestC-${Date.now()}`;
      const guestCart = await ctx.makeGuestCart(guestToken, variant.id);

      await expect(
        ordersService.checkout(null, guestToken, {
          cartId: guestCart.id,
          customerName: 'Guest',
          customerPhone: '+998900000003',
          addressId: address.id,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("User A o'zining addressId'sidan User B foydalana olmaydi", async () => {
      const userA = await ctx.makeCustomer();
      const userB = await ctx.makeCustomer();
      const variant = await ctx.makeVariant();
      const addressA = await ctx.makeAddress(userA.id);
      const cartB = await ctx.makeUserCart(userB.id, variant.id);

      await expect(
        ordersService.checkout(userB.id, null, {
          cartId: cartB.id,
          customerName: 'B',
          customerPhone: '+998900000004',
          addressId: addressA.id,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('#3 branch authorization — updateStatus / assignBranch / assertBranchAccessForAdmin', () => {
    it('OWN_BRANCH admin boshqa filial orderining statusini o\'zgartira olmaydi', async () => {
      const branchX = await ctx.makeBranch('Filial X');
      const branchY = await ctx.makeBranch('Filial Y');
      const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });
      const variant = await ctx.makeVariant();
      const address = await ctx.makeAddress(null);
      const { order } = await ctx.makeOrderWithReservation({
        branchId: branchY.id,
        variantId: variant.id,
        quantity: 1,
        addressId: address.id,
      });

      await expect(
        ordersService.updateStatus(order.id, 'CONFIRMED' as any, adminX as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('OWN_BRANCH admin ruxsatsiz filialga assignBranch qila olmaydi', async () => {
      const branchX = await ctx.makeBranch('Filial X2');
      const branchY = await ctx.makeBranch('Filial Y2');
      const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });
      const variant = await ctx.makeVariant();
      const address = await ctx.makeAddress(null);
      const { order } = await ctx.makeOrderWithReservation({
        branchId: branchY.id, // MANUAL_REVIEW holatida branchId odatda null, lekin bu yerda faqat assignBranch'ning branch tekshiruvini sinaymiz
        variantId: variant.id,
        quantity: 1,
        addressId: address.id,
        status: 'MANUAL_REVIEW',
      });

      await expect(
        ordersService.assignBranch(order.id, branchY.id, adminX as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("SELECTED_BRANCHES admin tanlanmagan filialga (GET /admin/:id) kira olmaydi", async () => {
      const branchX = await ctx.makeBranch('Filial X3');
      const branchY = await ctx.makeBranch('Filial Y3');
      const adminXY = await ctx.makeAdmin({ branchScope: BranchScope.SELECTED_BRANCHES, branchIds: [branchX.id] });
      const variant = await ctx.makeVariant();
      const address = await ctx.makeAddress(null);
      const { order } = await ctx.makeOrderWithReservation({
        branchId: branchY.id,
        variantId: variant.id,
        quantity: 1,
        addressId: address.id,
      });

      await expect(
        ordersService.assertBranchAccessForAdmin(order.id, adminXY as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SELECTED_BRANCHES admin o\'ziga tegishli filial orderiga kira oladi', async () => {
      const branchX = await ctx.makeBranch('Filial X4');
      const adminX = await ctx.makeAdmin({ branchScope: BranchScope.SELECTED_BRANCHES, branchIds: [branchX.id] });
      const variant = await ctx.makeVariant();
      const address = await ctx.makeAddress(null);
      const { order } = await ctx.makeOrderWithReservation({
        branchId: branchX.id,
        variantId: variant.id,
        quantity: 1,
        addressId: address.id,
      });

      await expect(ordersService.assertBranchAccessForAdmin(order.id, adminX as any)).resolves.toBeDefined();
    });
  });
});
