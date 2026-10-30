"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./auth-context";

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isFavorited: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !accessToken) {
      setFavoriteIds(new Set());
      return;
    }
    apiFetch<string[]>("/favorites/ids", { accessToken })
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => setFavoriteIds(new Set()));
  }, [user, accessToken]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!accessToken) return;
      const isFav = favoriteIds.has(productId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        await apiFetch(`/favorites/${productId}`, { method: isFav ? "DELETE" : "POST", accessToken });
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(productId);
          else next.delete(productId);
          return next;
        });
      }
    },
    [accessToken, favoriteIds],
  );

  const isFavorited = useCallback((productId: string) => favoriteIds.has(productId), [favoriteIds]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorited, toggle }}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
