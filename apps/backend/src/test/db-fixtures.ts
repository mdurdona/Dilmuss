import { UserRole, BranchScope } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * #17 operatsion tuzatish: testlar HECH QACHON `DATABASE_URL` (dev/production) ga ulanmasligi
 * kerak — faqat alohida `TEST_DATABASE_URL`ga. `TEST_DATABASE_URL` yo'q bo'lsa yoki bazasi
 * nomida "test" so'zi bo'lmasa (tasodifan dev/prod URL qo'yib qo'yishning oldini olish uchun),
 * testlar butunlay ishga tushmaydi — jim ravishda haqiqiy ma'lumotlarga tegishdan ko'ra shunday.
 */
function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL sozlanmagan. Testlar DATABASE_URL (dev/production) ga ulanishi mumkin emas — " +
        ".env fayliga alohida TEST_DATABASE_URL qo'shing (masalan alohida \"dilmuss_test\" bazasi).",
    );
  }
  if (!/test/i.test(url)) {
    const masked = url.replace(/:[^:@/]+@/, ':***@');
    throw new Error(
      `TEST_DATABASE_URL xavfli ko'rinadi — bazasi nomida "test" so'zi yo'q: ${masked}. ` +
        "Bu haqiqiy dev/production baza bo'lishi mumkin, shuning uchun testlar unga ulanishdan bosh tortadi.",
    );
  }
  return url;
}

/**
 * Xavfsizlik tuzatishlarini (#1-#5) DB'ga qarshi tekshirish uchun yordamchi — endi HAR DOIM
 * yuqoridagi `resolveTestDatabaseUrl()` orqali tasdiqlangan alohida test bazasiga ulanadi.
 * Har bir test shu klassning alohida nusxasini ishlatadi, .cleanup() esa faqat shu
 * nusxa yaratgan qatorlarni FK tartibiga rioya qilib o'chiradi.
 */
export class TestContext {
  readonly prisma = new PrismaService({ datasourceUrl: resolveTestDatabaseUrl() });

  private orderIds: string[] = [];
  private paymentIds: string[] = [];
  private cartIds: string[] = [];
  private addressIds: string[] = [];
  private branchIds: string[] = [];
  private variantIds: string[] = [];
  private productIds: string[] = [];
  private userIds: string[] = [];
  private stockTransferIds: string[] = [];

  private phoneSeq = 0;
  private uniquePhone() {
    this.phoneSeq += 1;
    return `+998${Date.now().toString().slice(-7)}${String(this.phoneSeq).padStart(3, '0')}`;
  }

  async makeBranch(name = 'Test filial') {
    const branch = await this.prisma.branch.create({
      data: { name, code: `T-${randomUUID().slice(0, 8)}`, region: 'Toshkent', city: 'Toshkent' },
    });
    this.branchIds.push(branch.id);
    return branch;
  }

  async makeCustomer() {
    const user = await this.prisma.user.create({
      data: { role: UserRole.CUSTOMER, fullName: 'Test Customer', phone: this.uniquePhone(), passwordHash: 'x' },
    });
    this.userIds.push(user.id);
    return user;
  }

  /**
   * role=SUPERADMIN, lekin `activeSuperadminMarker: null` bilan — bazadagi haqiqiy ACTIVE
   * SUPERADMIN'ning @unique markeriga to'qnashmaydi (Postgres'da NULL'lar bir-biriga teng emas).
   */
  async makeSuperadmin() {
    const user = await this.prisma.user.create({
      data: { role: UserRole.SUPERADMIN, fullName: 'Test Superadmin', phone: this.uniquePhone(), passwordHash: 'x' },
    });
    this.userIds.push(user.id);
    return user;
  }

  async makeAdmin(opts: { branchScope: BranchScope; branchIds?: string[]; primaryBranchId?: string }) {
    const user = await this.prisma.user.create({
      data: {
        role: UserRole.ADMIN,
        fullName: 'Test Admin',
        phone: this.uniquePhone(),
        passwordHash: 'x',
        branchScope: opts.branchScope,
      },
    });
    this.userIds.push(user.id);
    const branchIds = opts.branchIds ?? (opts.primaryBranchId ? [opts.primaryBranchId] : []);
    for (const branchId of branchIds) {
      await this.prisma.userBranch.create({
        data: { userId: user.id, branchId, isPrimary: branchId === opts.primaryBranchId },
      });
    }
    return user;
  }

  async makeVariant(opts: { color?: string; size?: string } = {}) {
    const product = await this.prisma.product.create({ data: { name: 'Test mahsulot', basePrice: 100000 } });
    this.productIds.push(product.id);
    const variant = await this.prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `TSKU-${randomUUID()}`,
        color: opts.color ?? 'Qora',
        size: opts.size ?? 'M',
      },
    });
    this.variantIds.push(variant.id);
    return variant;
  }

  async seedInventory(branchId: string, variantId: string, onHand: number, reserved = 0) {
    return this.prisma.branchInventory.upsert({
      where: { branchId_variantId: { branchId, variantId } },
      create: { branchId, variantId, onHand, reserved },
      update: { onHand, reserved },
    });
  }

  async makeUserCart(userId: string, variantId: string, quantity = 1) {
    const cart = await this.prisma.cart.create({ data: { userId } });
    this.cartIds.push(cart.id);
    await this.prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
    return cart;
  }

  async makeGuestCart(guestToken: string, variantId: string, quantity = 1) {
    const cart = await this.prisma.cart.create({ data: { guestToken } });
    this.cartIds.push(cart.id);
    await this.prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
    return cart;
  }

  async makeAddress(userId: string | null) {
    const address = await this.prisma.address.create({
      data: { userId, recipientName: 'Test', phone: '+998900000000', region: 'Toshkent shahri', district: 'Chilonzor' },
    });
    this.addressIds.push(address.id);
    return address;
  }

  /** To'liq Order + OrderItem + Reservation zanjirini (checkout()ni chetlab) to'g'ridan-to'g'ri yaratadi. */
  async makeOrderWithReservation(params: {
    userId?: string | null;
    branchId: string;
    variantId: string;
    quantity: number;
    addressId: string;
    status?: 'PENDING_PAYMENT' | 'MANUAL_REVIEW';
  }) {
    const unitPrice = 100000;
    const order = await this.prisma.order.create({
      data: {
        orderNumber: `T${Date.now()}${Math.floor(Math.random() * 1000)}`,
        userId: params.userId ?? null,
        customerName: 'Test',
        customerPhone: '+998900000000',
        status: params.status ?? 'PENDING_PAYMENT',
        subtotal: unitPrice * params.quantity,
        total: unitPrice * params.quantity,
        branchId: params.branchId,
        addressId: params.addressId,
        items: {
          create: [
            {
              variantId: params.variantId,
              productId: (await this.prisma.productVariant.findUniqueOrThrow({ where: { id: params.variantId } }))
                .productId,
              quantity: params.quantity,
              originalPrice: unitPrice,
              actualPrice: unitPrice,
              productCode: 1,
              productName: 'Test mahsulot',
              sku: 'TSKU',
              color: 'Qora',
              size: 'M',
            },
          ],
        },
      },
      include: { items: true },
    });
    this.orderIds.push(order.id);

    const reservation = await this.prisma.stockReservation.create({
      data: {
        orderItemId: order.items[0].id,
        branchId: params.branchId,
        variantId: params.variantId,
        quantity: params.quantity,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return { order, reservation };
  }

  async makePayment(orderId: string, amount: number) {
    const payment = await this.prisma.payment.create({
      data: { orderId, provider: 'PAYME', amount, status: 'PENDING' },
    });
    this.paymentIds.push(payment.id);
    return payment;
  }

  /** Delivery yaratadi va Order'ga bog'laydi — cleanup() bu qatorni orderId orqali topib o'chiradi. */
  async makeDelivery(orderId: string, fee = 30000) {
    return this.prisma.delivery.create({ data: { orderId, fee } });
  }

  async makeStockTransfer(params: {
    fromBranchId: string;
    toBranchId: string;
    requestedById: string;
    variantId: string;
    quantity: number;
    status?: 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  }) {
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        fromBranchId: params.fromBranchId,
        toBranchId: params.toBranchId,
        requestedById: params.requestedById,
        status: params.status ?? 'REQUESTED',
        items: { create: [{ variantId: params.variantId, quantity: params.quantity }] },
      },
    });
    this.stockTransferIds.push(transfer.id);
    return transfer;
  }

  trackOrder(orderId: string) {
    this.orderIds.push(orderId);
  }

  /** Servisning o'z metodi orqali (ctx.makeStockTransfer() emas) yaratilgan transferni cleanup ro'yxatiga qo'shadi. */
  trackStockTransfer(id: string) {
    this.stockTransferIds.push(id);
  }

  async cleanup() {
    const p = this.prisma;
    const safe = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[TestContext.cleanup] warning:', (err as Error).message);
      }
    };

    // PaymentTransaction'ni faqat ctx.makePayment() bilan kuzatilgan paymentIds bo'yicha emas,
    // orderIds orqali ham topib o'chiramiz — chunki masalan ClickAdapter.prepare() kabi servis
    // metodlari Payment/PaymentTransaction'ni bevosita (ctx.makePayment()ni chetlab) yaratadi,
    // va PaymentTransaction.payment onDelete:Restrict bo'lgani uchun bu qator qolib ketsa,
    // Payment va undan keyin Order o'chirilishi ham (sukut bo'yicha, jim) muvaffaqiyatsiz bo'ladi.
    await safe(() =>
      p.paymentTransaction.deleteMany({
        where: { OR: [{ paymentId: { in: this.paymentIds } }, { payment: { orderId: { in: this.orderIds } } }] },
      }),
    );
    await safe(() => p.payment.deleteMany({ where: { id: { in: this.paymentIds } } }));
    await safe(() => p.payment.deleteMany({ where: { orderId: { in: this.orderIds } } }));
    await safe(() => p.delivery.deleteMany({ where: { orderId: { in: this.orderIds } } }));
    await safe(() => p.notification.deleteMany({ where: { orderId: { in: this.orderIds } } }));
    await safe(() => p.order.deleteMany({ where: { id: { in: this.orderIds } } })); // cascades OrderItem, StockReservation, OrderStatusHistory
    await safe(() =>
      p.inventoryMovement.deleteMany({
        where: { OR: [{ branchId: { in: this.branchIds } }, { variantId: { in: this.variantIds } }] },
      }),
    );
    await safe(() => p.stockTransfer.deleteMany({ where: { id: { in: this.stockTransferIds } } })); // cascades StockTransferItem
    await safe(() =>
      p.branchInventory.deleteMany({
        where: { OR: [{ branchId: { in: this.branchIds } }, { variantId: { in: this.variantIds } }] },
      }),
    );
    await safe(() => p.stockReservation.deleteMany({ where: { variantId: { in: this.variantIds } } }));
    await safe(() => p.productVariant.deleteMany({ where: { id: { in: this.variantIds } } }));
    await safe(() => p.product.deleteMany({ where: { id: { in: this.productIds } } }));
    await safe(() => p.cart.deleteMany({ where: { id: { in: this.cartIds } } }));
    await safe(() => p.address.deleteMany({ where: { id: { in: this.addressIds } } }));
    await safe(() => p.auditLog.deleteMany({ where: { branchId: { in: this.branchIds } } }));
    await safe(() => p.branch.deleteMany({ where: { id: { in: this.branchIds } } }));
    await safe(() => p.user.deleteMany({ where: { id: { in: this.userIds } } }));

    await p.$disconnect();
  }
}
