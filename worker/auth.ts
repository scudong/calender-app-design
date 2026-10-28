import type { D1Database, SessionUser } from "./types";

const COOKIE = "kw_session";
const SESSION_DAYS = 14;
const ITERATIONS = 10_000;

const enc = new TextEncoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64url(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return b64url(buf);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, saltB64: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromB64(saltB64) as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return b64(new Uint8Array(bits));
}

export function newSalt(): string {
  return b64(crypto.getRandomValues(new Uint8Array(16)));
}

export function sessionCookie(token: string, secure = true, maxAgeSeconds = SESSION_DAYS * 86400): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function clearCookie(secure = true): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function readCookie(request: Request, name = COOKIE): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "employee" | "manager" | "admin";
  manager_id: string | null;
  password_hash: string;
  password_salt: string;
  created_at: string;
};

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  await db
    .prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(tokenHash, userId, now.toISOString(), expires.toISOString())
    .run();
  return token;
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function currentUser(db: D1Database, request: Request): Promise<SessionUser | null> {
  const token = readCookie(request);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.manager_id, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{ id: string; email: string; name: string; role: SessionUser["role"]; manager_id: string | null; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, managerId: row.manager_id };
}
