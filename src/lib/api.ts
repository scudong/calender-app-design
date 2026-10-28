import type { AppState } from "@/lib/types";
import type { SyncChanges } from "@/lib/sync";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: "employee" | "manager" | "admin";
  managerId: string | null;
};

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error ?? "request_failed";
    throw new ApiError(res.status, code);
  }
  return data as T;
}

export function login(email: string, password: string) {
  return request<{ user: ApiUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function register(email: string, password: string, name: string) {
  return request<{ user: ApiUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export const logout = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });

export const getBootstrap = () => request<{ user: ApiUser; state: AppState }>("/api/bootstrap");

export const postSync = (changes: SyncChanges) =>
  request<void>("/api/sync", { method: "POST", body: JSON.stringify({ changes }) });

export type AdminOverview = {
  users: {
    id: string;
    email: string;
    name: string;
    role: string;
    managerId: string | null;
    contractDays: number;
    carryoverDays: number;
    used: number;
    pendingDays: number;
    pendingCount: number;
    available: number;
  }[];
  requests: {
    id: string;
    status: string;
    type: string;
    duration: string;
    days: number;
    from: string;
    to: string;
    notes: string;
    submittedAt: string;
    userId: string;
    userName: string;
    userEmail: string;
  }[];
};

export const getAdminOverview = () => request<AdminOverview>("/api/admin/overview");

export const setRequestStatus = (id: string, status: "approved" | "declined") =>
  request<{ ok: true }>(`/api/admin/requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const updateUser = (id: string, patch: { role?: string; managerId?: string | null }) =>
  request<{ ok: true }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ ok: true }>("/api/auth/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
