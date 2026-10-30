import type { OrderStatus } from "@/lib/types";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "To'lov kutilmoqda",
  MANUAL_REVIEW: "Ko'rib chiqilmoqda",
  CONFIRMED: "Tasdiqlandi",
  PROCESSING: "Tayyorlanmoqda",
  PACKED: "Qadoqlandi",
  SHIPPED: "Yo'lda",
  DELIVERED: "Yetkazib berildi",
  CANCELLED: "Bekor qilingan",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  MANUAL_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  PACKED: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  SHIPPED: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};
