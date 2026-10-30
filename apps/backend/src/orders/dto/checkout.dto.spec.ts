import 'reflect-metadata'; // @Type() dekoratori shuni talab qiladi — Nest bootstrap'da avtomatik, standalone testda qo'lda kerak
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckoutDto } from './checkout.dto';

describe('CheckoutDto — security fix #12: newAddress nested validation', () => {
  const base = {
    cartId: 'cart-1',
    customerName: 'Test',
    customerPhone: '+998900000000',
  };

  it("newAddress'da majburiy maydon (region) yo'q bo'lsa validatsiya xatosi beradi", async () => {
    const dto = plainToInstance(CheckoutDto, {
      ...base,
      newAddress: { recipientName: 'A', phone: '+998900000000', district: 'Chilonzor' }, // region yo'q
    });

    const errors = await validate(dto);
    const addressErrors = errors.find((e) => e.property === 'newAddress');

    expect(addressErrors).toBeDefined();
    expect(addressErrors?.children?.some((c) => c.property === 'region')).toBe(true);
  });

  it("newAddress butunlay yaroqsiz turdagi qiymat bo'lsa (masalan string) validatsiya xatosi beradi", async () => {
    const dto = plainToInstance(CheckoutDto, {
      ...base,
      newAddress: 'not-an-object',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newAddress')).toBe(true);
  });

  it("to'liq va to'g'ri newAddress bilan validatsiya xatosiz o'tadi", async () => {
    const dto = plainToInstance(CheckoutDto, {
      ...base,
      newAddress: {
        recipientName: 'Ali',
        phone: '+998900000000',
        region: 'Toshkent shahri',
        district: 'Chilonzor',
      },
    });

    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'newAddress')).toBeUndefined();
  });
});
