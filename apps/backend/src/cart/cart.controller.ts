import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CartService } from './cart.service';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { RequestUser } from '../common/types/request-user';

const GUEST_COOKIE = 'dilmuss_guest_token';
const GUEST_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private async resolveCart(req: Request, res: Response) {
    const user = req.user as RequestUser | null;
    const guestToken = req.cookies?.[GUEST_COOKIE] ?? null;
    const cart = await this.cartService.getOrCreateCart(user?.id ?? null, guestToken);

    if (!user && cart.guestToken && cart.guestToken !== guestToken) {
      res.cookie(GUEST_COOKIE, cart.guestToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: GUEST_COOKIE_MAX_AGE_MS,
      });
    }

    return cart;
  }

  @Get()
  async getCart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cart = await this.resolveCart(req, res);
    return this.cartService.getCartWithTotals(cart.id);
  }

  @Post('items')
  async addItem(
    @Body('variantId') variantId: string,
    @Body('quantity') quantity: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolveCart(req, res);
    await this.cartService.addItem(cart.id, variantId, quantity ?? 1);
    return this.cartService.getCartWithTotals(cart.id);
  }

  @Patch('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolveCart(req, res);
    await this.cartService.updateItemQuantity(cart.id, id, quantity);
    return this.cartService.getCartWithTotals(cart.id);
  }

  @Delete('items/:id')
  async removeItem(@Param('id') id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cart = await this.resolveCart(req, res);
    await this.cartService.removeItem(cart.id, id);
    return this.cartService.getCartWithTotals(cart.id);
  }
}
