import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.favoritesService.list(user.id);
  }

  @Get('ids')
  listIds(@CurrentUser() user: RequestUser) {
    return this.favoritesService.listIds(user.id);
  }

  @Post(':productId')
  add(@Param('productId') productId: string, @CurrentUser() user: RequestUser) {
    return this.favoritesService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(@Param('productId') productId: string, @CurrentUser() user: RequestUser) {
    return this.favoritesService.remove(user.id, productId);
  }
}
