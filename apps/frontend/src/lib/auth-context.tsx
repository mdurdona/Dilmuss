"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "./api";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (fullName: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refresh rotates the token, so two concurrent calls (e.g. React StrictMode's
  // double-invoked effect) would race: the second request's cookie is already
  // revoked by the first. Sharing one in-flight promise avoids that race.
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const trySilentRefresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      try {
        const result = await apiFetch<{ user: AuthUser; accessToken: string }>("/auth/refresh", { method: "POST" });
        setUser(result.user);
        setAccessToken(result.accessToken);
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    trySilentRefresh();
  }, [trySilentRefresh]);

  const login = useCallback(async (phone: string, password: string) => {
    const result = await apiFetch<{ user: AuthUser; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setUser(result.user);
    setAccessToken(result.accessToken);
  }, []);

  const register = useCallback(async (fullName: string, phone: string, password: string) => {
    const result = await apiFetch<{ user: AuthUser; accessToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, phone, password }),
    });
    setUser(result.user);
    setAccessToken(result.accessToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, loading, login, register, logout, setUser, refreshAccessToken: trySilentRefresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
