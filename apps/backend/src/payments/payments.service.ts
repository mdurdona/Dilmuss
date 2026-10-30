import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentProvider, PaymentStatus, PaymentTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /** TZ 12 — checkout uchun Payment yozuvini yaratadi (yoki mavjud PENDING'ni qaytaradi). */
  async initiate(orderId: string, provider: PaymentProvider) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException("Bu buyurtma uchun to'lov boshlab bo'lmaydi");
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId, provider, status: PaymentStatus.PENDING },
    });
    if (existing) return existing;

    return this.prisma.payment.create({
      data: { orderId, provider, amount: order.total, status: PaymentStatus.PENDING },
    });
  }

  async findByProviderTxn(provider: PaymentProvider, providerTransactionId: string) {
    return this.prisma.payment.findUnique({
      where: { provider_providerTransactionId: { provider, providerTransactionId } },
    });
  }

  attachProviderTxnId(paymentId: string, providerTransactionId: string) {
    return this.prisma.payment.update({ where: { id: paymentId }, data: { providerTransactionId } });
  }

  /** TZ 12, 27.4 — @@unique([orderId, paidMarker]) orqali bitta order uchun faqat 1 ta PAID Payment kafolatlanadi. */
  async markPaid(paymentId: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status === PaymentStatus.PAID) return payment;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.PAID, paidAt: new Date(), paidMarker: true },
        });
        // Order tasdiqlash + inventory consume shu bitta transaction ichida — payment PAID bo'lib,
        // order/inventory yangilanmay qolishi (inconsistent holat) mumkin emas.
        await this.ordersService.markPaid(payment.orderId, tx);
        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Boshqa Payment (masalan boshqa provayder) allaqachon shu order uchun PAID bo'lgan — idempotent qaytarish
        return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      }
      throw error;
    }
  }

  async markFailed(paymentId: string, reason: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    });
  }

  async findOrThrow(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    return payment;
  }

  /** Webhook qayta-qayta kelishi mumkin — idempotencyKey bo'yicha upsert, duplicate xato bermaydi. */
  logTransaction(params: {
    paymentId: string;
    provider: PaymentProvider;
    type: PaymentTransactionType;
    amount: number;
    idempotencyKey: string;
    signatureValid?: boolean;
    rawPayload?: Prisma.InputJsonValue;
  }) {
    return this.prisma.paymentTransaction.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      create: params,
      update: {},
    });
  }
}
