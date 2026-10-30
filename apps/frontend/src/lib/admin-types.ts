import type { OrderStatus } from "./types";

export interface AdminProductListItem {
  id: string;
  productCode: string;
  name: string;
  basePrice: number;
  status: "ACTIVE" | "ARCHIVED";
  mainImageUrl: string | null;
  categories: string[];
}

export interface AdminProductListResponse {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminVariant {
  id: string;
  sku: string;
  color: string;
  colorHex: string | null;
  size: string;
  price: number | null;
  isActive: boolean;
}

export interface AdminProductDetail {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  basePrice: number;
  status: "ACTIVE" | "ARCHIVED";
  discountType: "PERCENT" | "AMOUNT" | null;
  discountValue: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  videoUrl: string | null;
  fit: string | null;
  seasons: string[];
  careInstructions: string | null;
  modelInfo: string | null;
  deliveryInfo: string | null;
  returnPolicy: string | null;
  categories: { id: string; name: string }[];
  images: { id: string; url: string; color: string | null; isMain: boolean }[];
  variants: AdminVariant[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  children: AdminCategory[];
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: string;
  total: number;
  createdAt: string;
  branch: { id: string; name: string } | null;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  items: {
    id: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    actualPrice: number;
  }[];
  address: {
    recipientName: string;
    phone: string;
    region: string;
    district: string;
    street: string | null;
    house: string | null;
  };
  statusHistory: { id: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; createdAt: string; note: string | null }[];
  payments: { id: string; provider: string; status: string; amount: number }[];
}

export interface AdminBranch {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  isMain: boolean;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: "SUPERADMIN" | "ADMIN" | "CUSTOMER";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  branchScope: "OWN_BRANCH" | "SELECTED_BRANCHES" | "ALL_BRANCHES";
  createdAt: string;
}

export interface AdminBranchInventoryRow {
  id: string;
  branchId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
  variant: {
    color: string;
    size: string;
    sku: string;
    product: { name: string; productCode: number };
  };
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export interface UserPermissionOverrideRow {
  effect: "GRANT" | "REVOKE";
  permission: { code: string };
}

export interface SystemSetting {
  key: string;
  value: unknown;
  description: string | null;
}
