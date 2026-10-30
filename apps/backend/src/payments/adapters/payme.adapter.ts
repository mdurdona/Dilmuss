import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus, PaymentTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments.service';

/**
 * Payme (Paycom) Merchant API — JSON-RPC 2.0 webhook adapter.
 * Referens: https://developer.help.paycom.uz/ — kodlar sandbox/production'ga qarab tekshirilishi kerak.
 */
const PAYME_ERROR = {
  INVALID_AMOUNT: -31001,
  ORDER_NOT_FOUND: -31050,
  ORDER_NOT_PAYABLE: -31051,
  TRANSACTION_NOT_FOUND: -31003,
  CANNOT_CANCEL: -31007,
  AUTH_FAILED: -32504,
  METHOD_NOT_FOUND: -32601,
};

interface JsonRpcRequest {
  method: string;
  params: Record<string, any>;
  id: number | string;
}

@Injectable()
export class PaymeAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
  ) {}

  checkAuth(authHeader?: string): boolean {
    if (!authHeader?.startsWith('Basic ')) return false;
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const [, key] = decoded.split(':');
    const secret = this.configService.get<string>('PAYME_SECRET_KEY') || this.configService.get<string>('PAYME_TEST_KEY');
    return Boolean(secret) && key === secret;
  }

  buildCheckoutUrl(orderId: string, amount: number): string {
    const merchantId = this.configService.get<string>('PAYME_MERCHANT_ID');
    const params = `m=${merchantId};ac.order_id=${orderId};a=${amount * 100}`;
    const encoded = Buffer.from(params).toString('base64');
    return `https://checkout.paycom.uz/${encoded}`;
  }

  async handle(req: JsonRpcRequest) {
    switch (req.method) {
      case 'CheckPerformTransaction':
        return this.checkPerformTransaction(req);
      case 'CreateTransaction':
        return this.createTransaction(req);
      case 'PerformTransaction':
        return this.performTransaction(req);
      case 'CancelTransaction':
        return this.cancelTransaction(req);
      case 'CheckTransaction':
        return this.checkTransaction(req);
      default:
        return { error: { code: PAYME_ERROR.METHOD_NOT_FOUND, message: 'Method not found' }, id: req.id };
    }
  }

  private async findOrder(orderId: string) {
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  private async checkPerformTransaction(req: JsonRpcRequest) {
    const orderId = req.params.account?.order_id;
    const order = orderId ? await this.findOrder(orderId) : null;
    if (!order) return { error: { code: PAYME_ERROR.ORDER_NOT_FOUND, message: 'Order not found' }, id: req.id };
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { error: { code: PAYME_ERROR.ORDER_NOT_PAYABLE, message: "Order is not payable" }, id: req.id };
    }
    if (req.params.amount !== order.total * 100) {
      return { error: { code: PAYME_ERROR.INVALID_AMOUNT, message: 'Incorrect amount' }, id: req.id };
    }
    return { result: { allow: true }, id: req.id };
  }

  private async createTransaction(req: JsonRpcRequest) {
    const { id: txnId, amount, account, time } = req.params;
    const orderId = account?.order_id;
    const order = orderId ? await this.findOrder(orderId) : null;
    if (!order) return { error: { code: PAYME_ERROR.ORDER_NOT_FOUND, message: 'Order not found' }, id: req.id };

    let payment = await this.paymentsService.findByProviderTxn(PaymentProvider.PAYME, txnId);
    if (payment) {
      return {
        result: { create_time: payment.createdAt.getTime(), transaction: txnId, state: payment.status === PaymentStatus.PAID ? 2 : 1 },
        id: req.id,
      };
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { error: { code: PAYME_ERROR.ORDER_NOT_PAYABLE, message: 'Order is not payable' }, id: req.id };
    }

    payment = await this.prisma.payment.create({
      data: { orderId, provider: PaymentProvider.PAYME, amount: amount / 100, status: PaymentStatus.PENDING, providerTransactionId: txnId },
    });

    await this.paymentsService.logTransaction({
      paymentId: payment.id,
      provider: PaymentProvider.PAYME,
      type: PaymentTransactionType.INIT,
      amount: amount / 100,
      idempotencyKey: `payme:${txnId}:create`,
      rawPayload: req.params,
    });

    return { result: { create_time: payment.createdAt.getTime(), transaction: txnId, state: 1 }, id: req.id };
  }

  private async performTransaction(req: JsonRpcRequest) {
    const { id: txnId } = req.params;
    const payment = await this.paymentsService.findByProviderTxn(PaymentProvider.PAYME, txnId);
    if (!payment) return { error: { code: PAYME_ERROR.TRANSACTION_NOT_FOUND, message: 'Transaction not found' }, id: req.id };

    if (payment.status === PaymentStatus.PAID) {
      return { result: { transaction: txnId, perform_time: payment.paidAt!.getTime(), state: 2 }, id: req.id };
    }

    const updated = await this.paymentsService.markPaid(payment.id);

    await this.paymentsService.logTransaction({
      paymentId: payment.id,
      provider: PaymentProvider.PAYME,
      type: PaymentTransactionType.COMPLETE,
      amount: payment.amount,
      idempotencyKey: `payme:${txnId}:perform`,
    });

    return { result: { transaction: txnId, perform_time: updated.paidAt!.getTime(), state: 2 }, id: req.id };
  }

  private async cancelTransaction(req: JsonRpcRequest) {
    const { id: txnId, reason } = req.params;
    const payment = await this.paymentsService.findByProviderTxn(PaymentProvider.PAYME, txnId);
    if (!payment) return { error: { code: PAYME_ERROR.TRANSACTION_NOT_FOUND, message: 'Transaction not found' }, id: req.id };

    const wasPaid = payment.status === PaymentStatus.PAID;
    await this.paymentsService.markFailed(payment.id, `Payme cancel: reason=${reason}`);

    await this.paymentsService.logTransaction({
      paymentId: payment.id,
      provider: PaymentProvider.PAYME,
      type: PaymentTransactionType.CANCEL,
      amount: payment.amount,
      idempotencyKey: `payme:${txnId}:cancel`,
      rawPayload: req.params,
    });

    return { result: { transaction: txnId, cancel_time: Date.now(), state: wasPaid ? -2 : -1 }, id: req.id };
  }

  private async checkTransaction(req: JsonRpcRequest) {
    const { id: txnId } = req.params;
    const payment = await this.paymentsService.findByProviderTxn(PaymentProvider.PAYME, txnId);
    if (!payment) return { error: { code: PAYME_ERROR.TRANSACTION_NOT_FOUND, message: 'Transaction not found' }, id: req.id };

    const state = payment.status === PaymentStatus.PAID ? 2 : payment.status === PaymentStatus.FAILED ? -1 : 1;
    return {
      result: {
        create_time: payment.createdAt.getTime(),
        perform_time: payment.paidAt?.getTime() ?? 0,
        cancel_time: payment.status === PaymentStatus.FAILED ? payment.updatedAt.getTime() : 0,
        transaction: txnId,
        state,
      },
      id: req.id,
    };
  }
}
