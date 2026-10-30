import { Body, Controller, ForbiddenException, Headers, HttpCode, Param, Post, UnauthorizedException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymeAdapter } from './adapters/payme.adapter';
import { ClickAdapter } from './adapters/click.adapter';
import { PayDto } from './dto/pay.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymeAdapter: PaymeAdapter,
    private readonly clickAdapter: ClickAdapter,
  ) {}

  @Public()
  @Post('orders/:orderId/pay')
  async pay(@Param('orderId') orderId: string, @Body() dto: PayDto) {
    const payment = await this.paymentsService.initiate(orderId, dto.provider);
    const checkoutUrl =
      dto.provider === PaymentProvider.PAYME
        ? this.paymeAdapter.buildCheckoutUrl(orderId, payment.amount)
        : this.clickAdapter.buildCheckoutUrl(orderId, payment.amount);
    return { paymentId: payment.id, checkoutUrl };
  }

  /**
   * Demo rejimi: haqiqiy Payme/Click webhook o'rniga to'lovni muvaffaqiyatli deb belgilaydi.
   * Productionda ishlamaydi — u yerda faqat provayder webhooki to'lovni tasdiqlaydi.
   */
  @Public()
  @Post('payments/:paymentId/demo-confirm')
  async demoConfirm(@Param('paymentId') paymentId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException("Demo to'lov productionda o'chirilgan");
    }
    const payment = await this.paymentsService.markPaid(paymentId);
    return { status: payment.status, orderId: payment.orderId };
  }

  @Public()
  @Post('payments/payme/webhook')
  @HttpCode(200)
  async paymeWebhook(@Body() body: any, @Headers('authorization') authHeader?: string) {
    if (!this.paymeAdapter.checkAuth(authHeader)) {
      throw new UnauthorizedException({ error: { code: -32504, message: 'Insufficient privilege' }, id: body?.id });
    }
    return this.paymeAdapter.handle(body);
  }

  @Public()
  @Post('payments/click/prepare')
  @HttpCode(200)
  clickPrepare(@Body() body: any) {
    return this.clickAdapter.prepare(body);
  }

  @Public()
  @Post('payments/click/complete')
  @HttpCode(200)
  clickComplete(@Body() body: any) {
    return this.clickAdapter.complete(body);
  }
}
