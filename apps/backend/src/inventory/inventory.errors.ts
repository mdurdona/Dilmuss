import { BadRequestException } from '@nestjs/common';

export class InsufficientStockException extends BadRequestException {
  constructor(variantId: string, branchId: string) {
    super(`Filialda (${branchId}) variant (${variantId}) uchun yetarli zaxira yo'q`);
  }
}
