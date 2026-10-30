export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Category[];
}

export interface ProductListItem {
  id: string;
  productCode: string;
  name: string;
  basePrice: number;
  discountedPrice: number;
  mainImageUrl: string | null;
  colors: { color: string; colorHex: string | null }[];
  sizes: string[];
}

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductVariant {
  id: string;
  color: string;
  colorHex: string | null;
  size: string;
  price: number;
  effectivePrice: number;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  color: string | null;
  isMain: boolean;
  sortOrder: number;
}

export interface ProductDetail {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  basePrice: number;
  discountedPrice: number;
  careInstructions: string | null;
  modelInfo: string | null;
  deliveryInfo: string | null;
  returnPolicy: string | null;
  fit: string | null;
  seasons: string[];
  videoUrl: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: Category[];
  relatedProducts: ProductListItem[];
}

export interface CartItemDto {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  sku: string;
  quantity: number;
  originalPrice: number;
  actualPrice: number;
  lineTotal: number;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotal: number;
  discountTotal: number;
  total: number;
}

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: "SUPERADMIN" | "ADMIN" | "CUSTOMER";
  status: string;
  createdAt: string;
}

export interface OrderItemDto {
  id: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  actualPrice: number;
  productCode: number;
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "MANUAL_REVIEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: OrderItemDto[];
  delivery?: { status: string; fee: number } | null;
}

export interface DeliveryZoneQuote {
  fee: number;
  zoneId: string;
}
