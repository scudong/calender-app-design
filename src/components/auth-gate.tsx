"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getBootstrap, login, register } from "@/lib/api";
import { resetSync, startSync } from "@/lib/sync";
import { t } from "@/lib/i18n";
import { useT } from "@/hooks/use-i18n";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "loading" | "anon" | "ready" | "error";

const CARD = "w-full max-w-[380px] rounded-2xl border border-hairline bg-surface p-7 shadow-sm";

function Splash() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-app">
      <div className="flex flex-col items-center gap-3">
        <span className="font-inter text-[18px] font-semibold tracking-[-0.3px] text-fg">Kargul</span>
        <span className="t-12 text-fg-2">{t("Loading…")}</span>
      </div>
    </div>
  );
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-app px-6">
      <div className={CARD}>
        <h1 className="t-16 text-fg">{t("Can’t reach the server")}</h1>
        <p className="mt-2 t-13 text-fg-2">{t("Check your connection and try again.")}</p>
        <Button className="mt-5 w-full" onClick={onRetry}>
          {t("Retry")}
        </Button>
      </div>
    </div>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Wrong email or password",
  email_taken: "This email is already registered",
  weak_password: "Password must be at least 8 characters",
  invalid_email: "Enter a valid email address",
  invalid_name: "Enter a valid name",
  bad_request: "Something went wrong. Try again.",
  request_failed: "Something went wrong. Try again.",
};

function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const tText = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
      onAuthed();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "request_failed";
      setError(tText(AUTH_ERRORS[code] ?? AUTH_ERRORS.request_failed));
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-app px-6">
      <div className={CARD}>
        <div className="mb-6 flex flex-col gap-1">
          <span className="font-inter text-[20px] font-semibold tracking-[-0.4px] text-fg">Kargul</span>
          <span className="t-13 text-fg-2">{tText("Sign in to your workspace")}</span>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-app p-1" role="tablist">
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={
                mode === value
                  ? "h-8 rounded-md bg-surface text-[13px] font-medium text-fg shadow-sm"
                  : "h-8 rounded-md text-[13px] text-fg-2"
              }
            >
              {tText(value === "login" ? "Log in" : "Sign up")}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-name">{tText("Name")}</Label>
              <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={tText("Your name")} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-email">{tText("Email")}</Label>
            <Input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-password">{tText("Password")}</Label>
            <Input
              id="auth-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={tText("At least 8 characters")}
            />
          </div>

          {error && <p className="t-12 text-danger">{error}</p>}

          <Button type="submit" className="mt-1 w-full" disabled={busy || !email || !password}>
            {busy ? tText("Please wait…") : tText(mode === "login" ? "Log in" : "Create account")}
          </Button>
        </form>

        <p className="mt-5 t-12 leading-[1.5] text-fg-2">
          {tText("Data is stored in your Cloudflare D1 database and scoped to your account.")}
        </p>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const user = useAuthStore((s) => s.user);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    try {
      const { user, state } = await getBootstrap();
      useAuthStore.getState().setUser(user);
      useAppStore.setState(state);
      resetSync(useAppStore.getState());
      startSync();
      setStatus("ready");
    } catch (error) {
      setStatus(error instanceof ApiError && error.status === 401 ? "anon" : "error");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === "ready" && !user) setStatus("anon");
  }, [status, user]);

  if (status === "ready" && user) return <>{children}</>;
  if (status === "loading") return <Splash />;
  if (status === "error") return <ErrorScreen onRetry={() => void bootstrap()} />;
  return <AuthScreen onAuthed={() => void bootstrap()} />;
}
