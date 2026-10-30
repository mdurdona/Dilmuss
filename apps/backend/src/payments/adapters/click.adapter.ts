import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OrderStatus, PaymentProvider, PaymentStatus, PaymentTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments.service';

/**
 * Click Merchant API — Prepare/Complete webhook adapter.
 * Referens: https://docs.click.uz/ — sign_string formulasi va error kodlari tekshirilishi kerak.
 */
const CLICK_ERROR = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  TRANSACTION_CANCELLED: -9,
};

interface ClickWebhookBody {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
  error?: string;
}

@Injectable()
export class ClickAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
  ) {}

  buildCheckoutUrl(orderId: string, amount: number): string {
    const serviceId = this.configService.get<string>('CLICK_SERVICE_ID');
    const merchantId = this.configService.get<string>('CLICK_MERCHANT_ID');
    return `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${amount}&transaction_param=${orderId}`;
  }

  private verifySign(body: ClickWebhookBody, isComplete: boolean): boolean {
    const secret = this.configService.get<string>('CLICK_SECRET_KEY');
    // CLICK_SECRET_KEY sozlanmagan bo'lsa, Array.join('') uni bo'sh satr sifatida qo'shib yuboradi —
    // shu holatda imzoning boshqa barcha bo'laklari hujumchining o'zi so'rov tanasida yuboradigan
    // qiymatlar, ya'ni u to'g'ri imzoni sirni bilmasdan ham hisoblab, buyurtmani soxta "to'landi"
    // deb belgilashi mumkin edi. Payme adapteridagi kabi — bo'sh sir bilan darhol rad etamiz.
    if (!secret) return false;
    const parts = isComplete
      ? [body.click_trans_id, body.service_id, secret, body.merchant_trans_id, body.merchant_prepare_id, body.amount, body.action, body.sign_time]
      : [body.click_trans_id, body.service_id, secret, body.merchant_trans_id, body.amount, body.action, body.sign_time];
    const expected = crypto.createHash('md5').update(parts.join('')).digest('hex');
    return expected === body.sign_string;
  }

  async prepare(body: ClickWebhookBody) {
    const signValid = this.verifySign(body, false);
    if (!signValid) {
      return { error: CLICK_ERROR.SIGN_FAILED, error_note: 'SIGN CHECK FAILED', click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
    }

    const order = await this.prisma.order.findUnique({ where: { id: body.merchant_trans_id } });
    if (!order) {
      return { error: CLICK_ERROR.ORDER_NOT_FOUND, error_note: 'Order not found', click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
    }
    if (Number(body.amount) !== order.total) {
      return { error: CLICK_ERROR.INCORRECT_AMOUNT, error_note: 'Incorrect amount', click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { error: CLICK_ERROR.ALREADY_PAID, error_note: 'Order already processed', click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
    }

    const payment = await this.prisma.payment.upsert({
      where: { provider_providerTransactionId: { provider: PaymentProvider.CLICK, providerTransactionId: body.click_trans_id } },
      create: { orderId: order.id, provider: PaymentProvider.CLICK, amount: order.total, status: PaymentStatus.PENDING, providerTransactionId: body.click_trans_id },
      update: {},
    });

    await this.paymentsService.logTransaction({
      paymentId: payment.id,
      provider: PaymentProvider.CLICK,
      type: PaymentTransactionType.PREPARE,
      amount: order.total,
      idempotencyKey: `click:${body.click_trans_id}:prepare`,
      signatureValid: true,
      rawPayload: body as unknown as Prisma.InputJsonValue,
    });

    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: CLICK_ERROR.SUCCESS,
      error_note: 'Success',
    };
  }

  async complete(body: ClickWebhookBody) {
    const signValid = this.verifySign(body, true);
    if (!signValid) {
      return { error: CLICK_ERROR.SIGN_FAILED, error_note: 'SIGN CHECK FAILED', click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { provider_providerTransactionId: { provider: PaymentProvider.CLICK, providerTransactionId: body.click_trans_id } },
    });
    if (!payment) {
      return { error: CLICK_ERROR.TRANSACTION_NOT_FOUND, error_note: 'Transaction not found', click_trans_id: body.click_trans_id, merchant_trans_id: body.merchant_trans_id };
    }

    if (Number(body.error) < 0) {
      await this.paymentsService.markFailed(payment.id, `Click error: ${body.error}`);
      await this.paymentsService.logTransaction({
        paymentId: payment.id,
        provider: PaymentProvider.CLICK,
        type: PaymentTransactionType.CANCEL,
        amount: payment.amount,
        idempotencyKey: `click:${body.click_trans_id}:cancel`,
        signatureValid: true,
        rawPayload: body as unknown as Prisma.InputJsonValue,
      });
      return {
        click_trans_id: body.click_trans_id,
        merchant_trans_id: body.merchant_trans_id,
        merchant_confirm_id: payment.id,
        error: CLICK_ERROR.TRANSACTION_CANCELLED,
        error_note: 'Transaction cancelled',
      };
    }

    if (payment.status !== PaymentStatus.PAID) {
      await this.paymentsService.markPaid(payment.id);
      await this.paymentsService.logTransaction({
        paymentId: payment.id,
        provider: PaymentProvider.CLICK,
        type: PaymentTransactionType.COMPLETE,
        amount: payment.amount,
        idempotencyKey: `click:${body.click_trans_id}:complete`,
        signatureValid: true,
        rawPayload: body as unknown as Prisma.InputJsonValue,
      });
    }

    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: payment.id,
      error: CLICK_ERROR.SUCCESS,
      error_note: 'Success',
    };
  }
}
