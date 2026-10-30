import { applyDecorators } from '@nestjs/common';
import { Matches, MinLength } from 'class-validator';

/**
 * Faqat admin-boshqaruv oqimlarida ishlatiladi (admin yaratish, admin parolini reset qilish) —
 * mijoz ro'yxatdan o'tish parol talabidan (6+) qattiqroq: 12+ belgi, katta/kichik harf va raqam.
 */
export function IsAdminPassword() {
  return applyDecorators(
    MinLength(12, { message: "Parol kamida 12 belgidan iborat bo'lishi kerak" }),
    Matches(/[a-z]/, { message: "Parolda kamida bitta kichik harf bo'lishi kerak" }),
    Matches(/[A-Z]/, { message: "Parolda kamida bitta katta harf bo'lishi kerak" }),
    Matches(/[0-9]/, { message: "Parolda kamida bitta raqam bo'lishi kerak" }),
  );
}
