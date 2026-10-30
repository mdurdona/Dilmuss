const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  accessToken?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, Array.isArray(message) ? message.join(", ") : message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, accessToken?: string) {
  return apiFetch<T>(path, { method: "GET", accessToken });
}

export function apiPost<T>(path: string, body?: unknown, accessToken?: string) {
  return apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined, accessToken });
}

export function apiPatch<T>(path: string, body?: unknown, accessToken?: string) {
  return apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined, accessToken });
}

export function apiPut<T>(path: string, body?: unknown, accessToken?: string) {
  return apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined, accessToken });
}

export function apiDelete<T>(path: string, accessToken?: string) {
  return apiFetch<T>(path, { method: "DELETE", accessToken });
}
