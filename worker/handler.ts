import { clearCookie, createSession, currentUser, destroySession, hashPassword, newSalt, readCookie, sessionCookie, sha256Hex } from "./auth";
import {
  adminOverview,
  applyChanges,
  loadState,
  seedUser,
  setRequestStatusAsManager,
  type SyncChanges,
} from "./data";
import type { Env, SessionUser } from "./types";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function fail(status: number, error: string, message?: string): Response {
  return json({ error, message: message ?? error }, status);
}

async function body<T>(request: Request, limit = 1_500_000): Promise<T | null> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > limit) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;

function toPublicUser(user: SessionUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, managerId: user.managerId };
}

async function findUserByEmail(env: Env, email: string) {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<{
    id: string;
    email: string;
    name: string;
    role: SessionUser["role"];
    manager_id: string | null;
    password_hash: string;
    password_salt: string;
  }>();
}

async function register(request: Request, env: Env): Promise<Response> {
  const input = await body<{ email?: string; password?: string; name?: string }>(request);
  if (!input) return fail(400, "bad_request");
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";
  const name = (input.name ?? "").trim() || email.split("@")[0];
  if (!isEmail(email)) return fail(400, "invalid_email");
  if (password.length < 8) return fail(400, "weak_password");
  if (name.length > 120) return fail(400, "invalid_name");

  if (await findUserByEmail(env, email)) return fail(409, "email_taken");

  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const role = admins.includes(email) ? "admin" : "employee";

  const id = `us-${crypto.randomUUID().slice(0, 8)}`;
  const salt = newSalt();
  const hash = await hashPassword(password, salt);
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO users (id,email,name,role,manager_id,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(id, email, name, role, null, hash, salt, now)
    .run();

  await seedUser(env.DB, id, "zh");

  // The seed carries a demo profile; make the account owner's identity the one
  // shown in the UI.
  const initials = name.includes(" ")
    ? name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : name.slice(0, 2).toUpperCase();
  await env.DB.prepare("UPDATE profiles SET name = ?, email = ?, initials = ? WHERE user_id = ?")
    .bind(name, email, initials, id)
    .run();

  const token = await createSession(env.DB, id);
  const secure = new URL(request.url).protocol === "https:";
  return json({ user: { id, email, name, role, managerId: null } }, 201, { "set-cookie": sessionCookie(token, secure) });
}

async function login(request: Request, env: Env): Promise<Response> {
  const input = await body<{ email?: string; password?: string }>(request);
  if (!input) return fail(400, "bad_request");
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";
  if (!isEmail(email) || !password) return fail(400, "invalid_credentials");

  const user = await findUserByEmail(env, email);
  if (!user) return fail(401, "invalid_credentials");
  const hash = await hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) return fail(401, "invalid_credentials");

  const token = await createSession(env.DB, user.id);
  const secure = new URL(request.url).protocol === "https:";
  return json(
    { user: { id: user.id, email: user.email, name: user.name, role: user.role, managerId: user.manager_id } },
    200,
    { "set-cookie": sessionCookie(token, secure) },
  );
}

async function logout(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request);
  if (token) await destroySession(env.DB, token);
  const secure = new URL(request.url).protocol === "https:";
  return json({ ok: true }, 200, { "set-cookie": clearCookie(secure) });
}

/* ------------------------------------------------------------------ routes */

export async function handleApi(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Not found", { status: 404 });
    }

    try {
      if (path === "/api/auth/register" && request.method === "POST") return await register(request, env);
      if (path === "/api/auth/login" && request.method === "POST") return await login(request, env);
      if (path === "/api/auth/logout" && request.method === "POST") return await logout(request, env);

      const user = await currentUser(env.DB, request);
      if (!user) return fail(401, "unauthorized");

      if (path === "/api/auth/me" && request.method === "GET") return json({ user: toPublicUser(user) });

      if (path === "/api/auth/password" && request.method === "POST") {
        const input = await body<{ currentPassword?: string; newPassword?: string }>(request);
        if (!input) return fail(400, "bad_request");
        const currentPassword = input.currentPassword ?? "";
        const newPassword = input.newPassword ?? "";
        if (newPassword.length < 8) return fail(400, "weak_password");

        const row = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?")
          .bind(user.id)
          .first<{ password_hash: string; password_salt: string }>();
        if (!row) return fail(401, "unauthorized");
        const currentHash = await hashPassword(currentPassword, row.password_salt);
        if (currentHash !== row.password_hash) return fail(400, "wrong_password");

        const salt = newSalt();
        const hash = await hashPassword(newPassword, salt);
        await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
          .bind(hash, salt, user.id)
          .run();

        // Sign out every other device; this session stays valid.
        const token = readCookie(request);
        if (token) {
          const keep = await sha256Hex(token);
          await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, keep).run();
        }
        return json({ ok: true });
      }

      if (path === "/api/bootstrap" && request.method === "GET") {
        const state = await loadState(env.DB, user.id);
        return json({ user: toPublicUser(user), state });
      }

      if (path === "/api/sync" && request.method === "POST") {
        const input = await body<{ changes?: SyncChanges }>(request);
        if (!input?.changes || typeof input.changes !== "object") return fail(400, "bad_request");
        await applyChanges(env.DB, user.id, input.changes);
        return new Response(null, { status: 204 });
      }

      if (path === "/api/admin/overview" && request.method === "GET") {
        if (user.role !== "admin" && user.role !== "manager") return fail(403, "forbidden");
        const year = (url.searchParams.get("year") ?? String(new Date().getUTCFullYear())).slice(0, 4);
        return json(await adminOverview(env.DB, user, year));
      }

      const userMatch = path.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)$/);
      if (userMatch && request.method === "PATCH") {
        if (user.role !== "admin") return fail(403, "forbidden");
        const input = await body<{ role?: string; managerId?: string | null }>(request);
        const id = userMatch[1];
        const existing = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).first<{ id: string; role: string }>();
        if (!existing) return fail(404, "not_found");

        let role = existing.role;
        if (input?.role !== undefined) {
          if (!["employee", "manager", "admin"].includes(input.role)) return fail(400, "bad_role");
          role = input.role;
        }
        if (id === user.id && role !== "admin") return fail(400, "cannot_demote_self");

        if (input?.managerId !== undefined) {
          const managerId = input.managerId || null;
          if (managerId === id) return fail(400, "bad_manager");
          if (managerId) {
            const manager = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(managerId).first();
            if (!manager) return fail(400, "bad_manager");
          }
          await env.DB.prepare("UPDATE users SET role = ?, manager_id = ? WHERE id = ?").bind(role, managerId, id).run();
        } else {
          await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, id).run();
        }
        return json({ ok: true });
      }

      const statusMatch = path.match(/^\/api\/admin\/requests\/([A-Za-z0-9_-]+)$/);
      if (statusMatch && request.method === "PATCH") {
        if (user.role !== "admin" && user.role !== "manager") return fail(403, "forbidden");
        const input = await body<{ status?: string }>(request);
        const status = input?.status;
        if (!status || !["approved", "declined", "cancelled", "pending"].includes(status)) return fail(400, "bad_status");
        const result = await setRequestStatusAsManager(env.DB, user, statusMatch[1], status as "approved" | "declined" | "cancelled" | "pending");
        if (!result.ok) return fail(result.error === "forbidden" ? 403 : 404, result.error ?? "error");
        return json({ ok: true });
      }

      return fail(404, "not_found");
    } catch (error) {
      console.error("api_error", error);
      return fail(500, "internal_error");
    }
  }
