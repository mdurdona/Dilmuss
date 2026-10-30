import { TestContext } from '../test/db-fixtures';
import { buildServices } from '../test/service-builders';

describe('PaymentsService — security fix #5: Payment/Order/Inventory bitta atomik transaction', () => {
  const ctx = new TestContext();
  const { paymentsService } = buildServices(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("inventory consume ichida xato bo'lsa, butun transaction rollback bo'ladi (Payment PAID bo'lib qolmaydi)", async () => {
    const branch = await ctx.makeBranch();
    const variant = await ctx.makeVariant();
    const address = await ctx.makeAddress(null);
    await ctx.seedInventory(branch.id, variant.id, 10, 2);

    const { order, reservation } = await ctx.makeOrderWithReservation({
      branchId: branch.id,
      variantId: variant.id,
      quantity: 2,
      addressId: address.id,
    });
    const payment = await ctx.makePayment(order.id, order.total);

    // Real xato holatini simulyatsiya qilamiz: reservation'ning BranchInventory yozuvini
    // consume() chaqirilishidan oldin o'chiramiz — shunda inventoryService.consume() ichidagi
    // lockRow() `null` qaytaradi va NotFoundException tashlaydi, bu esa butun
    // $transaction'ni (payment.update ham kiradi) rollback qilishi kerak.
    await ctx.prisma.branchInventory.deleteMany({ where: { branchId: branch.id, variantId: variant.id } });

    await expect(paymentsService.markPaid(payment.id)).rejects.toThrow();

    const paymentAfter = await ctx.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const orderAfter = await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const reservationAfter = await ctx.prisma.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } });

    // Transaction rollback bo'lgani uchun HAMMASI eski holatda qolishi kerak:
    expect(paymentAfter.status).toBe('PENDING'); // PAID BO'LIB QOLMAGAN
    expect(orderAfter.status).toBe('PENDING_PAYMENT'); // CONFIRMED bo'lib qolmagan
    expect(reservationAfter.status).toBe('ACTIVE'); // CONSUMED bo'lib qolmagan
  });

  it("hammasi normal bo'lsa, Payment PAID + Order CONFIRMED + reservation CONSUMED birga sodir bo'ladi", async () => {
    const branch = await ctx.makeBranch();
    const variant = await ctx.makeVariant();
    const address = await ctx.makeAddress(null);
    await ctx.seedInventory(branch.id, variant.id, 10, 2);

    const { order, reservation } = await ctx.makeOrderWithReservation({
      branchId: branch.id,
      variantId: variant.id,
      quantity: 2,
      addressId: address.id,
    });
    const payment = await ctx.makePayment(order.id, order.total);

    await paymentsService.markPaid(payment.id);

    const paymentAfter = await ctx.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const orderAfter = await ctx.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const reservationAfter = await ctx.prisma.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } });
    const inventoryAfter = await ctx.prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_variantId: { branchId: branch.id, variantId: variant.id } },
    });

    expect(paymentAfter.status).toBe('PAID');
    expect(orderAfter.status).toBe('CONFIRMED');
    expect(orderAfter.paymentStatus).toBe('PAID');
    expect(reservationAfter.status).toBe('CONSUMED');
    expect(inventoryAfter.onHand).toBe(8); // 10 - 2 (consumed)
    expect(inventoryAfter.reserved).toBe(0); // 2 - 2
  });
});
