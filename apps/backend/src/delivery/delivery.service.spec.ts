import { ForbiddenException } from '@nestjs/common';
import { BranchScope } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { buildServices } from '../test/service-builders';

describe('DeliveryService — security fix #7: permission != branch access', () => {
  const ctx = new TestContext();
  const { deliveryService } = buildServices(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("OWN_BRANCH admin boshqa filial buyurtmasining yetkazib berish holatini o'zgartira olmaydi", async () => {
    const branchX = await ctx.makeBranch();
    const branchY = await ctx.makeBranch();
    const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });
    const variant = await ctx.makeVariant();
    const address = await ctx.makeAddress(null);
    const { order } = await ctx.makeOrderWithReservation({
      branchId: branchY.id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });
    const delivery = await ctx.makeDelivery(order.id);

    await expect(
      deliveryService.updateStatus(delivery.id, 'IN_TRANSIT' as any, undefined, adminX as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it("o'z filialiga tegishli delivery statusini o'zgartirish ishlaydi", async () => {
    const branchX = await ctx.makeBranch();
    const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });
    const variant = await ctx.makeVariant();
    const address = await ctx.makeAddress(null);
    const { order } = await ctx.makeOrderWithReservation({
      branchId: branchX.id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });
    const delivery = await ctx.makeDelivery(order.id);

    const updated = await deliveryService.updateStatus(delivery.id, 'IN_TRANSIT' as any, undefined, adminX as any);
    expect(updated.status).toBe('IN_TRANSIT');
  });

  it("OrdersService'dan ichki chaqiruvda (actor berilmasa) branch tekshiruvi o'tkazib yuboriladi", async () => {
    const branchY = await ctx.makeBranch();
    const variant = await ctx.makeVariant();
    const address = await ctx.makeAddress(null);
    const { order } = await ctx.makeOrderWithReservation({
      branchId: branchY.id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });
    const delivery = await ctx.makeDelivery(order.id);

    // actor berilmagan — bu OrdersService o'zining allaqachon branch-tekshirilgan oqimidan
    // chaqirgan holatni simulyatsiya qiladi.
    const updated = await deliveryService.updateStatus(delivery.id, 'DELIVERED' as any);
    expect(updated.status).toBe('DELIVERED');
  });

  it("SELECTED_BRANCHES admin faqat o'z filiallariga tegishli deliverylarni ko'radi (branchId berilmasa ham)", async () => {
    const branchX = await ctx.makeBranch();
    const branchY = await ctx.makeBranch();
    const adminX = await ctx.makeAdmin({ branchScope: BranchScope.SELECTED_BRANCHES, branchIds: [branchX.id] });
    const variant = await ctx.makeVariant();
    const address = await ctx.makeAddress(null);

    const { order: orderX } = await ctx.makeOrderWithReservation({
      branchId: branchX.id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });
    const { order: orderY } = await ctx.makeOrderWithReservation({
      branchId: branchY.id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });
    const deliveryX = await ctx.makeDelivery(orderX.id);
    const deliveryY = await ctx.makeDelivery(orderY.id);

    const results = await deliveryService.list({}, adminX as any);
    const ids = results.map((d) => d.id);
    expect(ids).toContain(deliveryX.id);
    expect(ids).not.toContain(deliveryY.id);
  });

  it("branchId query orqali ruxsatsiz filial so'ralsa rad etiladi", async () => {
    const branchX = await ctx.makeBranch();
    const branchY = await ctx.makeBranch();
    const adminX = await ctx.makeAdmin({ branchScope: BranchScope.OWN_BRANCH, primaryBranchId: branchX.id });

    await expect(deliveryService.list({ branchId: branchY.id }, adminX as any)).rejects.toThrow(ForbiddenException);
  });
});
