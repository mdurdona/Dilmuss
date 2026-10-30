import * as crypto from 'crypto';
import { PaymentsService } from '../payments.service';
import { ClickAdapter } from './click.adapter';
import { TestContext } from '../../test/db-fixtures';

function computeSign(parts: (string | undefined)[]) {
  return crypto.createHash('md5').update(parts.join('')).digest('hex');
}

describe('ClickAdapter.verifySign — security fix #14: CLICK_SECRET_KEY sozlanmaganda fail-closed', () => {
  const ctx = new TestContext();
  const paymentsService = new PaymentsService(ctx.prisma, {} as any);

  afterAll(async () => {
    await ctx.cleanup();
  });

  function buildAdapter(secretValue: string | undefined) {
    const configStub = { get: (key: string) => (key === 'CLICK_SECRET_KEY' ? secretValue : undefined) } as any;
    return new ClickAdapter(ctx.prisma, configStub, paymentsService);
  }

  it("CLICK_SECRET_KEY sozlanmagan bo'lsa, hujumchi imzoni 'bo'sh sir' deb hisoblab yasagan so'rov ham rad etiladi", async () => {
    const address = await ctx.makeAddress(null);
    const variant = await ctx.makeVariant();
    const { order } = await ctx.makeOrderWithReservation({
      branchId: (await ctx.makeBranch()).id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });

    const body = {
      click_trans_id: '111',
      service_id: '222',
      merchant_trans_id: order.id,
      amount: String(order.total),
      action: '0',
      sign_time: '2026-01-01 00:00:00',
      // Hujumchi CLICK_SECRET_KEY bo'sh/sozlanmagan deb taxmin qilib, uni bo'sh satr sifatida
      // qo'shib imzo hisoblagan — bu aynan eski (tuzatilmagan) kodda ishlab ketardi.
      sign_string: computeSign(['111', '222', '', order.id, String(order.total), '0', '2026-01-01 00:00:00']),
    };

    const adapter = buildAdapter(undefined); // CLICK_SECRET_KEY sozlanmagan
    const result = await adapter.prepare(body as any);

    expect(result.error).toBe(-1); // SIGN_FAILED
    const payment = await ctx.prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment).toBeNull(); // hech qanday Payment yaratilmagan
  });

  it("haqiqiy sir bilan to'g'ri hisoblangan imzo qabul qilinadi (regressiya nazorati)", async () => {
    const address = await ctx.makeAddress(null);
    const variant = await ctx.makeVariant();
    const { order } = await ctx.makeOrderWithReservation({
      branchId: (await ctx.makeBranch()).id,
      variantId: variant.id,
      quantity: 1,
      addressId: address.id,
    });

    const secret = 'real-click-secret';
    const body = {
      click_trans_id: '333',
      service_id: '444',
      merchant_trans_id: order.id,
      amount: String(order.total),
      action: '0',
      sign_time: '2026-01-01 00:00:00',
      sign_string: computeSign(['333', '444', secret, order.id, String(order.total), '0', '2026-01-01 00:00:00']),
    };

    const adapter = buildAdapter(secret);
    const result = await adapter.prepare(body as any);

    expect(result.error).toBe(0); // SUCCESS
    const payment = await ctx.prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment).not.toBeNull();
  });
});
