// Minimal Cloudflare bindings and row types. Kept local so the project does
// not need the full workers-types package or a second tsconfig.

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  ADMIN_EMAILS?: string;
}

export type Role = "employee" | "manager" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId: string | null;
};
