import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { applyDiscount, resolveVariantPrice } from '../common/utils/pricing';

const GUEST_CART_TTL_DAYS = 30;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string | null, guestToken: string | null) {
    if (userId) {
      const existing = await this.prisma.cart.findUnique({ where: { userId } });
      if (existing) return existing;
      return this.prisma.cart.create({ data: { userId } });
    }

    if (guestToken) {
      const existing = await this.prisma.cart.findUnique({ where: { guestToken } });
      if (existing) return existing;
    }

    return this.prisma.cart.create({
      data: {
        guestToken: guestToken ?? crypto.randomUUID(),
        expiresAt: new Date(Date.now() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  }

  /** Login/register bo'lganda guest savatchani foydalanuvchi savatchasiga birlashtiradi. */
  async mergeGuestCartIntoUser(userId: string, guestToken: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    });
    if (!guestCart) return;

    const userCart = await this.getOrCreateCart(userId, null);

    for (const item of guestCart.items) {
      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }

  async addItem(cartId: string, variantId: string, quantity: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || !variant.isActive) throw new NotFoundException('Variant topilmadi');
    if (quantity <= 0) throw new BadRequestException("Miqdor musbat bo'lishi kerak");

    return this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity },
      update: { quantity: { increment: quantity } },
    });
  }

  async updateItemQuantity(cartId: string, itemId: string, quantity: number) {
    if (quantity <= 0) return this.removeItem(cartId, itemId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Savat elementi topilmadi');
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(cartId: string, itemId: string) {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
    return { success: true };
  }

  async getCartWithTotals(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!cart) throw new NotFoundException('Savat topilmadi');

    const items = cart.items.map((item) => {
      const originalPrice = resolveVariantPrice(item.variant.product, item.variant);
      const productDiscounted = applyDiscount(originalPrice, item.variant.product);
      const actualPrice = applyDiscount(productDiscounted, item.variant);
      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.productId,
        productName: item.variant.product.name,
        color: item.variant.color,
        size: item.variant.size,
        sku: item.variant.sku,
        quantity: item.quantity,
        originalPrice,
        actualPrice,
        lineTotal: actualPrice * item.quantity,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return { id: cart.id, items, subtotal, discountTotal: subtotal - total, total };
  }
}
