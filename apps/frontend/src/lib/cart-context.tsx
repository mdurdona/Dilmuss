"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";
import type { CartDto } from "./types";

interface CartContextValue {
  cart: CartDto | null;
  loading: boolean;
  itemCount: number;
  refresh: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await apiFetch<CartDto>("/cart", { accessToken: accessToken ?? undefined });
      setCart(result);
    } catch {
      // Network hiccup or backend restart — leave the current cart state as-is;
      // this runs from a mount effect with no caller to hand the error to.
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Re-fetch whenever the signed-in identity changes (login/register/logout) —
  // login/register merges the guest cart into the user's cart server-side, which
  // replaces item ids; without this, stale ids from before the merge would 404
  // on the next update/remove call.
  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [refresh, authLoading, user?.id]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      const result = await apiFetch<CartDto>("/cart/items", {
        method: "POST",
        body: JSON.stringify({ variantId, quantity }),
        accessToken: accessToken ?? undefined,
      });
      setCart(result);
    },
    [accessToken],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      const result = await apiFetch<CartDto>(`/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
        accessToken: accessToken ?? undefined,
      });
      setCart(result);
    },
    [accessToken],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const result = await apiFetch<CartDto>(`/cart/items/${itemId}`, {
        method: "DELETE",
        accessToken: accessToken ?? undefined,
      });
      setCart(result);
    },
    [accessToken],
  );

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, refresh, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
