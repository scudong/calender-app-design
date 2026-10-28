import { toast } from "sonner";
import { ApiError, postSync } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { AppState } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";

type Item = { id: string };
type ArrayKey =
  | "workspaces"
  | "events"
  | "requests"
  | "holidays"
  | "notifications"
  | "documents"
  | "timeEntries"
  | "invoices"
  | "withdrawalMethods"
  | "benefits";

export type RowChange<T> = { upsert?: T[]; delete?: string[] };

export type SyncChanges = Partial<Record<ArrayKey, RowChange<Item>>> & {
  profile?: AppState["profile"];
  settings?: AppState["settings"];
  timer?: AppState["timer"];
  activeWorkspaceId?: string;
};

const ARRAYS: ArrayKey[] = [
  "workspaces",
  "events",
  "requests",
  "holidays",
  "notifications",
  "documents",
  "timeEntries",
  "invoices",
  "withdrawalMethods",
  "benefits",
];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Stable key-order stringify so objects from the API and local edits compare equal. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return `{${Object.keys(rec)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(rec[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function dataOf(state: AppState): AppState {
  return {
    version: state.version,
    workspaceId: state.workspaceId,
    workspaces: state.workspaces,
    events: state.events,
    requests: state.requests,
    holidays: state.holidays,
    profile: state.profile,
    settings: state.settings,
    notifications: state.notifications,
    documents: state.documents,
    timeEntries: state.timeEntries,
    timer: state.timer,
    invoices: state.invoices,
    withdrawalMethods: state.withdrawalMethods,
    benefits: state.benefits,
  };
}

export function diffState(prev: AppState, next: AppState): SyncChanges | null {
  const changes: SyncChanges = {};

  for (const key of ARRAYS) {
    const before = prev[key] as unknown as Item[];
    const after = next[key] as unknown as Item[];
    const byId = new Map(before.map((item) => [item.id, item]));
    const nextIds = new Set(after.map((item) => item.id));
    const upsert = after.filter((item) => {
      const old = byId.get(item.id);
      return !old || stable(old) !== stable(item);
    });
    const removed = before.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
    if (upsert.length || removed.length) {
      (changes as Record<string, RowChange<Item>>)[key] = {
        ...(upsert.length ? { upsert } : {}),
        ...(removed.length ? { delete: removed } : {}),
      };
    }
  }

  if (stable(prev.profile) !== stable(next.profile)) changes.profile = next.profile;
  if (stable(prev.settings) !== stable(next.settings)) changes.settings = next.settings;
  if (stable(prev.timer) !== stable(next.timer)) changes.timer = next.timer;
  if (prev.workspaceId !== next.workspaceId) changes.activeWorkspaceId = next.workspaceId;

  return Object.keys(changes).length ? changes : null;
}

let baseline: AppState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let started = false;

export function resetSync(state: AppState): void {
  baseline = clone(dataOf(state));
}

function schedule(): void {
  if (!started || !baseline) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), 600);
}

async function flush(): Promise<void> {
  if (!baseline || syncing) return;
  const current = dataOf(useAppStore.getState());
  const changes = diffState(baseline, current);
  if (!changes) return;
  syncing = true;
  try {
    await postSync(changes);
    baseline = clone(current);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      useAuthStore.getState().setUser(null);
    } else {
      toast.error(t("Changes could not be saved"));
      // Keep the local state; retry once the next edit comes in.
    }
  } finally {
    syncing = false;
  }
}

/** Starts pushing local store edits to the API. Safe to call more than once. */
export function startSync(): void {
  if (started) return;
  started = true;
  useAppStore.subscribe(() => schedule());
}

export function stopSync(): void {
  started = false;
  baseline = null;
  if (timer) clearTimeout(timer);
  timer = null;
}
