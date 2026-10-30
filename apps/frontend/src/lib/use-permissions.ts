"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "./api";
import { useAuth } from "./auth-context";

export function usePermissions() {
  const { accessToken, user, refreshAccessToken } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await apiGet<{ permissions: string[] }>("/permissions/me", token);
        if (cancelled) return;
        setPermissions(new Set(res.permissions));
        setError(false);
      } catch (err) {
        // Access token may have expired (short TTL, no background refresh) — retry once after
        // refreshing, so an expired token doesn't look like "no permission" to the caller.
        if (err instanceof ApiError && err.status === 401) {
          await refreshAccessToken();
          return;
        }
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id, refreshAccessToken]);

  return { permissions, loading, error, has: (code: string) => permissions.has(code) };
}
