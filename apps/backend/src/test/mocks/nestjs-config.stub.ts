/**
 * `@nestjs/config@12` sof ESM (`"type": "module"`) sifatida chiqariladi, Jest esa CJS transform
 * ishlatadi — shu paketni import qiluvchi fayl (masalan TelegramAdapter) test ostida yuklansa,
 * "Must use import to load ES Module" xatosi beradi. Bu ilovaning o'zi ishlashiga ta'sir qilmaydi
 * (Nest/Next runtime'i buni to'g'ri boshqaradi), faqat Jest'ning modul tizimida muammo.
 *
 * Jest config'dagi `moduleNameMapper` shu faylni `@nestjs/config`ning o'rniga qo'yadi — faqat test
 * paytida, faqat shu paket kerak bo'lgan (lekin haqiqiy config qiymatlari muhim bo'lmagan) joylarda.
 */
export class ConfigService {
  get<T = unknown>(_key: string): T | undefined {
    return undefined;
  }
}
