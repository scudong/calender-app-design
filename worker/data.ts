import type {
  AppState,
  Benefit,
  CalEvent,
  DocumentFile,
  Holiday,
  Invoice,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  Profile,
  Settings,
  TimeEntry,
  Timer,
  WithdrawalMethod,
  Workspace,
} from "../src/lib/types";
import { createSeed, STATE_VERSION } from "../src/lib/seed";
import { translate, translateData } from "../src/lib/i18n";
import type { D1Database, SessionUser } from "./types";

/* ------------------------------------------------------------------ helpers */

const str = (v: unknown, max = 4000): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const int = (v: unknown): number => Math.trunc(num(v));
const bool = (v: unknown): number => (v ? 1 : 0);
const nullableStr = (v: unknown, max = 4000): string | null => (typeof v === "string" ? v.slice(0, max) : null);
const nullableNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null);

const LEAVE_TYPES = new Set(["Time off", "Sick", "Extra leave", "Half-day leave", "Personal leave"]);
const LEAVE_STATUSES = new Set(["approved", "pending", "declined", "cancelled"]);
const EVENT_COLORS = new Set(["green", "purple", "cyan", "orange", "pink", "blue"]);
const INVOICE_STATUSES = new Set(["draft", "sent", "paid", "overdue"]);
const DOC_CATEGORIES = new Set(["Contract", "Payslip", "Policy", "Medical", "Tax", "Other"]);
const WITHDRAWAL_KINDS = new Set(["bank", "paypal", "wise", "card"]);
const BENEFIT_CATEGORIES = new Set(["Health", "Wellness", "Learning", "Financial", "Lifestyle"]);

const oneOf = (set: Set<string>, value: unknown, fallback: string) => {
  const v = str(value, 40);
  return set.has(v) ? v : fallback;
};

/* --------------------------------------------------------------- row shapes */

type EventRow = {
  id: string;
  title: string;
  day: string;
  start_min: number;
  end_min: number;
  all_day: number;
  color: string;
  note: string | null;
  location: string | null;
  request_id: string | null;
};
type RequestRow = {
  id: string;
  status: string;
  type: string;
  duration: string;
  days: number;
  date_from: string;
  date_to: string;
  all_day: number;
  start_min: number | null;
  end_min: number | null;
  notes: string;
  submitted_at: string;
};
type HolidayRow = { id: string; day: string; name: string };
type NotificationRow = { id: string; title: string; body: string; created_at: string; read: number; href: string | null };
type DocumentRow = { id: string; name: string; category: string; size: number; uploaded_at: string; data_url: string | null; starred: number };
type TimeEntryRow = { id: string; day: string; project: string; task: string; minutes: number; billable: number };
type InvoiceRow = { id: string; number: string; client: string; issue_date: string; due_date: string; status: string; notes: string; currency: string };
type InvoiceItemRow = { id: string; invoice_id: string; description: string; quantity: number; rate: number };
type WithdrawalRow = { id: string; kind: string; label: string; holder: string; last4: string; currency: string; is_default: number; added_at: string };
type BenefitRow = {
  id: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  budget: number;
  used: number;
  enrolled: number;
  renews_on: string;
};
type SettingsRow = {
  language: string;
  week_starts_on: number;
  time_format: string;
  day_start_hour: number;
  contract_days: number;
  carryover_days: number;
  show_weekends: number;
  email_notifications: number;
  push_notifications: number;
  weekly_digest: number;
  active_workspace_id: string;
};

/* -------------------------------------------------------------- bootstrapping */

export async function loadState(db: D1Database, userId: string): Promise<AppState> {
  const [ws, ev, rq, ho, no, doc, te, tm, inv, items, wi, be, pr, se] = await Promise.all([
    db.prepare("SELECT id, name FROM workspaces WHERE user_id = ? ORDER BY rowid").bind(userId).all<Workspace>(),
    db
      .prepare(
        "SELECT id,title,day,start_min,end_min,all_day,color,note,location,request_id FROM events WHERE user_id = ? ORDER BY day, start_min",
      )
      .bind(userId)
      .all<EventRow>(),
    db.prepare("SELECT * FROM leave_requests WHERE user_id = ? ORDER BY submitted_at DESC").bind(userId).all<RequestRow>(),
    db.prepare("SELECT id, day, name FROM holidays WHERE user_id = ? ORDER BY day").bind(userId).all<HolidayRow>(),
    db
      .prepare("SELECT id,title,body,created_at,read,href FROM notifications WHERE user_id = ? ORDER BY created_at DESC")
      .bind(userId)
      .all<NotificationRow>(),
    db
      .prepare("SELECT id,name,category,size,uploaded_at,data_url,starred FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC")
      .bind(userId)
      .all<DocumentRow>(),
    db.prepare("SELECT id,day,project,task,minutes,billable FROM time_entries WHERE user_id = ? ORDER BY day DESC").bind(userId).all<TimeEntryRow>(),
    db.prepare("SELECT running,started_at,project,task FROM timers WHERE user_id = ?").bind(userId).first<{
      running: number;
      started_at: number | null;
      project: string;
      task: string;
    }>(),
    db.prepare("SELECT id,number,client,issue_date,due_date,status,notes,currency FROM invoices WHERE user_id = ? ORDER BY issue_date DESC").bind(userId).all<InvoiceRow>(),
    db.prepare("SELECT id,invoice_id,description,quantity,rate FROM invoice_items WHERE user_id = ? ORDER BY sort_order").bind(userId).all<InvoiceItemRow>(),
    db
      .prepare("SELECT id,kind,label,holder,last4,currency,is_default,added_at FROM withdrawal_methods WHERE user_id = ? ORDER BY added_at")
      .bind(userId)
      .all<WithdrawalRow>(),
    db
      .prepare("SELECT id,name,provider,category,description,budget,used,enrolled,renews_on FROM benefits WHERE user_id = ? ORDER BY rowid")
      .bind(userId)
      .all<BenefitRow>(),
    db
      .prepare(
        "SELECT name,email,initials,phone,job_title,department,manager,location,start_date,birthday,address,emergency_contact,bio FROM profiles WHERE user_id = ?",
      )
      .bind(userId)
      .first<Record<string, string>>(),
    db.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(userId).first<SettingsRow>(),
  ]);

  const itemsByInvoice = new Map<string, Invoice["items"]>();
  for (const it of items.results ?? []) {
    const list = itemsByInvoice.get(it.invoice_id) ?? [];
    list.push({ id: it.id, description: it.description, quantity: it.quantity, rate: it.rate });
    itemsByInvoice.set(it.invoice_id, list);
  }

  const profile: Profile = {
    name: pr?.name ?? "",
    email: pr?.email ?? "",
    initials: pr?.initials ?? "",
    phone: pr?.phone ?? "",
    jobTitle: pr?.job_title ?? "",
    department: pr?.department ?? "",
    manager: pr?.manager ?? "",
    location: pr?.location ?? "",
    startDate: pr?.start_date ?? "",
    birthday: pr?.birthday ?? "",
    address: pr?.address ?? "",
    emergencyContact: pr?.emergency_contact ?? "",
    bio: pr?.bio ?? "",
  };

  const settings: Settings = {
    language: (se?.language as Settings["language"]) ?? "zh",
    weekStartsOn: (se?.week_starts_on === 1 ? 1 : 0) as Settings["weekStartsOn"],
    timeFormat: se?.time_format === "12h" ? "12h" : "24h",
    dayStartHour: se?.day_start_hour ?? 6,
    contractDays: se?.contract_days ?? 12,
    carryoverDays: se?.carryover_days ?? 4,
    showWeekends: !!se?.show_weekends,
    emailNotifications: !!se?.email_notifications,
    pushNotifications: !!se?.push_notifications,
    weeklyDigest: !!se?.weekly_digest,
  };

  return {
    version: STATE_VERSION,
    workspaceId: se?.active_workspace_id ?? ws.results?.[0]?.id ?? "",
    workspaces: ws.results ?? [],
    events: (ev.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      date: r.day,
      start: r.start_min,
      end: r.end_min,
      allDay: !!r.all_day,
      color: (EVENT_COLORS.has(r.color) ? r.color : "blue") as CalEvent["color"],
      note: r.note ?? undefined,
      location: r.location ?? undefined,
      requestId: r.request_id ?? undefined,
    })),
    requests: (rq.results ?? []).map((r) => ({
      id: r.id,
      status: (LEAVE_STATUSES.has(r.status) ? r.status : "pending") as LeaveStatus,
      type: (LEAVE_TYPES.has(r.type) ? r.type : "Time off") as LeaveType,
      duration: r.duration,
      days: r.days,
      from: r.date_from,
      to: r.date_to,
      allDay: !!r.all_day,
      start: r.start_min ?? undefined,
      end: r.end_min ?? undefined,
      notes: r.notes,
      submittedAt: r.submitted_at,
    })),
    holidays: (ho.results ?? []).map((r) => ({ id: r.id, date: r.day, name: r.name })),
    notifications: (no.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      read: !!r.read,
      href: r.href ?? undefined,
    })),
    documents: (doc.results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      category: (DOC_CATEGORIES.has(r.category) ? r.category : "Other") as DocumentFile["category"],
      size: r.size,
      uploadedAt: r.uploaded_at,
      dataUrl: r.data_url ?? undefined,
      starred: !!r.starred,
    })),
    timeEntries: (te.results ?? []).map((r) => ({
      id: r.id,
      date: r.day,
      project: r.project,
      task: r.task,
      minutes: r.minutes,
      billable: !!r.billable,
    })),
    timer: {
      running: !!tm?.running,
      startedAt: tm?.started_at ?? null,
      project: tm?.project ?? "",
      task: tm?.task ?? "",
    },
    invoices: (inv.results ?? []).map((r) => ({
      id: r.id,
      number: r.number,
      client: r.client,
      issueDate: r.issue_date,
      dueDate: r.due_date,
      status: (INVOICE_STATUSES.has(r.status) ? r.status : "draft") as Invoice["status"],
      items: itemsByInvoice.get(r.id) ?? [],
      notes: r.notes,
      currency: r.currency,
    })),
    withdrawalMethods: (wi.results ?? []).map((r) => ({
      id: r.id,
      kind: (WITHDRAWAL_KINDS.has(r.kind) ? r.kind : "bank") as WithdrawalMethod["kind"],
      label: r.label,
      holder: r.holder,
      last4: r.last4,
      currency: r.currency,
      isDefault: !!r.is_default,
      addedAt: r.added_at,
    })),
    benefits: (be.results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      category: (BENEFIT_CATEGORIES.has(r.category) ? r.category : "Health") as Benefit["category"],
      description: r.description,
      budget: r.budget,
      used: r.used,
      enrolled: !!r.enrolled,
      renewsOn: r.renews_on,
    })),
    profile,
    settings,
  };
}

/* ------------------------------------------------------------------ seeding */

export async function seedUser(db: D1Database, userId: string, language: "zh" | "en"): Promise<void> {
  const seed = translateData(createSeed(), "en", language);
  const now = new Date().toISOString();
  const stmts = [];

  for (const w of seed.workspaces) {
    stmts.push(db.prepare("INSERT INTO workspaces (id,user_id,name) VALUES (?,?,?)").bind(w.id, userId, w.name));
  }
  stmts.push(
    db
      .prepare(
        `INSERT INTO profiles (user_id,name,email,initials,phone,job_title,department,manager,location,start_date,birthday,address,emergency_contact,bio)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        userId,
        seed.profile.name,
        seed.profile.email,
        seed.profile.initials,
        seed.profile.phone,
        seed.profile.jobTitle,
        seed.profile.department,
        seed.profile.manager,
        seed.profile.location,
        seed.profile.startDate,
        seed.profile.birthday,
        seed.profile.address,
        seed.profile.emergencyContact,
        seed.profile.bio,
      ),
  );
  const s = seed.settings;
  stmts.push(
    db
      .prepare(
        `INSERT INTO user_settings (user_id,language,week_starts_on,time_format,day_start_hour,contract_days,carryover_days,show_weekends,email_notifications,push_notifications,weekly_digest,active_workspace_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        userId,
        s.language,
        s.weekStartsOn,
        s.timeFormat,
        s.dayStartHour,
        s.contractDays,
        s.carryoverDays,
        bool(s.showWeekends),
        bool(s.emailNotifications),
        bool(s.pushNotifications),
        bool(s.weeklyDigest),
        seed.workspaceId,
      ),
  );
  for (const e of seed.events) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO events (id,user_id,title,day,start_min,end_min,all_day,color,note,location,request_id,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(e.id, userId, e.title, e.date, e.start, e.end, bool(e.allDay), e.color, e.note ?? null, e.location ?? null, e.requestId ?? null, now),
    );
  }
  for (const r of seed.requests) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO leave_requests (id,user_id,status,type,duration,days,date_from,date_to,all_day,start_min,end_min,notes,submitted_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(r.id, userId, r.status, r.type, r.duration, r.days, r.from, r.to, bool(r.allDay), nullableNum(r.start), nullableNum(r.end), r.notes, r.submittedAt),
    );
  }
  for (const h of seed.holidays) {
    stmts.push(db.prepare("INSERT INTO holidays (id,user_id,day,name) VALUES (?,?,?,?)").bind(h.id, userId, h.date, h.name));
  }
  for (const n of seed.notifications) {
    stmts.push(
      db
        .prepare("INSERT INTO notifications (id,user_id,title,body,created_at,read,href) VALUES (?,?,?,?,?,?,?)")
        .bind(n.id, userId, n.title, n.body, n.createdAt, bool(n.read), n.href ?? null),
    );
  }
  for (const d of seed.documents) {
    stmts.push(
      db
        .prepare("INSERT INTO documents (id,user_id,name,category,size,uploaded_at,data_url,starred) VALUES (?,?,?,?,?,?,?,?)")
        .bind(d.id, userId, d.name, d.category, d.size, d.uploadedAt, d.dataUrl ?? null, bool(d.starred)),
    );
  }
  for (const t of seed.timeEntries) {
    stmts.push(
      db
        .prepare("INSERT INTO time_entries (id,user_id,day,project,task,minutes,billable) VALUES (?,?,?,?,?,?,?)")
        .bind(t.id, userId, t.date, t.project, t.task, t.minutes, bool(t.billable)),
    );
  }
  stmts.push(
    db
      .prepare("INSERT INTO timers (user_id,running,started_at,project,task) VALUES (?,?,?,?,?)")
      .bind(userId, bool(seed.timer.running), seed.timer.startedAt, seed.timer.project, seed.timer.task),
  );
  for (const inv of seed.invoices) {
    stmts.push(
      db
        .prepare("INSERT INTO invoices (id,user_id,number,client,issue_date,due_date,status,notes,currency) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(inv.id, userId, inv.number, inv.client, inv.issueDate, inv.dueDate, inv.status, inv.notes, inv.currency),
    );
    inv.items.forEach((it, index) => {
      stmts.push(
        db
          .prepare("INSERT INTO invoice_items (id,invoice_id,user_id,description,quantity,rate,sort_order) VALUES (?,?,?,?,?,?,?)")
          .bind(it.id, inv.id, userId, it.description, it.quantity, it.rate, index),
      );
    });
  }
  for (const m of seed.withdrawalMethods) {
    stmts.push(
      db
        .prepare(
          "INSERT INTO withdrawal_methods (id,user_id,kind,label,holder,last4,currency,is_default,added_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(m.id, userId, m.kind, m.label, m.holder, m.last4, m.currency, bool(m.isDefault), m.addedAt),
    );
  }
  for (const b of seed.benefits) {
    stmts.push(
      db
        .prepare(
          "INSERT INTO benefits (id,user_id,name,provider,category,description,budget,used,enrolled,renews_on) VALUES (?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(b.id, userId, b.name, b.provider, b.category, b.description, b.budget, b.used, bool(b.enrolled), b.renewsOn),
    );
  }

  await db.batch(stmts);
}

/* --------------------------------------------------------------------- sync */

export type RowChange<T> = { upsert?: T[]; delete?: string[] };

export type SyncChanges = {
  workspaces?: RowChange<Workspace>;
  events?: RowChange<CalEvent>;
  requests?: RowChange<LeaveRequest>;
  holidays?: RowChange<Holiday>;
  notifications?: RowChange<{ id: string; title: string; body: string; createdAt: string; read: boolean; href?: string }>;
  documents?: RowChange<DocumentFile>;
  timeEntries?: RowChange<TimeEntry>;
  invoices?: RowChange<Invoice>;
  withdrawalMethods?: RowChange<WithdrawalMethod>;
  benefits?: RowChange<Benefit>;
  profile?: Profile;
  settings?: Settings;
  timer?: Timer;
  activeWorkspaceId?: string;
};

const MAX_ROWS = 400;

export async function applyChanges(db: D1Database, userId: string, changes: SyncChanges): Promise<void> {
  const stmts = [];
  const cap = <T>(rows: T[] | undefined) => (rows ?? []).slice(0, MAX_ROWS);

  if (changes.workspaces) {
    for (const id of (changes.workspaces.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM workspaces WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const w of cap(changes.workspaces.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO workspaces (id,user_id,name) VALUES (?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET name = excluded.name`,
          )
          .bind(str(w.id, 100), userId, str(w.name, 200)),
      );
    }
  }

  if (changes.events) {
    for (const id of (changes.events.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM events WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const e of cap(changes.events.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO events (id,user_id,title,day,start_min,end_min,all_day,color,note,location,request_id,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               title=excluded.title, day=excluded.day, start_min=excluded.start_min, end_min=excluded.end_min,
               all_day=excluded.all_day, color=excluded.color, note=excluded.note, location=excluded.location,
               request_id=excluded.request_id`,
          )
          .bind(
            str(e.id, 100),
            userId,
            str(e.title, 300),
            str(e.date, 10),
            int(e.start),
            int(e.end),
            bool(e.allDay),
            oneOf(EVENT_COLORS, e.color, "blue"),
            nullableStr(e.note),
            nullableStr(e.location),
            nullableStr(e.requestId, 100),
            new Date().toISOString(),
          ),
      );
    }
  }

  if (changes.requests) {
    for (const id of (changes.requests.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM leave_requests WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const r of cap(changes.requests.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO leave_requests (id,user_id,status,type,duration,days,date_from,date_to,all_day,start_min,end_min,notes,submitted_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               status=excluded.status, type=excluded.type, duration=excluded.duration, days=excluded.days,
               date_from=excluded.date_from, date_to=excluded.date_to, all_day=excluded.all_day,
               start_min=excluded.start_min, end_min=excluded.end_min, notes=excluded.notes`,
          )
          .bind(
            str(r.id, 100),
            userId,
            oneOf(LEAVE_STATUSES, r.status, "pending"),
            oneOf(LEAVE_TYPES, r.type, "Time off"),
            str(r.duration, 100),
            num(r.days),
            str(r.from, 10),
            str(r.to, 10),
            bool(r.allDay),
            nullableNum(r.start),
            nullableNum(r.end),
            str(r.notes, 4000),
            str(r.submittedAt, 40),
          ),
      );
    }
  }

  if (changes.holidays) {
    for (const id of (changes.holidays.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM holidays WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const h of cap(changes.holidays.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO holidays (id,user_id,day,name) VALUES (?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET day=excluded.day, name=excluded.name`,
          )
          .bind(str(h.id, 100), userId, str(h.date, 10), str(h.name, 200)),
      );
    }
  }

  if (changes.notifications) {
    for (const id of (changes.notifications.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const n of cap(changes.notifications.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO notifications (id,user_id,title,body,created_at,read,href) VALUES (?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET title=excluded.title, body=excluded.body, read=excluded.read, href=excluded.href`,
          )
          .bind(str(n.id, 100), userId, str(n.title, 300), str(n.body, 2000), str(n.createdAt, 40), bool(n.read), nullableStr(n.href, 300)),
      );
    }
  }

  if (changes.documents) {
    for (const id of (changes.documents.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const d of cap(changes.documents.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO documents (id,user_id,name,category,size,uploaded_at,data_url,starred) VALUES (?,?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               name=excluded.name, category=excluded.category, size=excluded.size, data_url=excluded.data_url, starred=excluded.starred`,
          )
          .bind(
            str(d.id, 100),
            userId,
            str(d.name, 300),
            oneOf(DOC_CATEGORIES, d.category, "Other"),
            int(d.size),
            str(d.uploadedAt, 40),
            // data: URLs are limited to ~1.5MB client-side; keep them out of D1.
            null,
            bool(d.starred),
          ),
      );
    }
  }

  if (changes.timeEntries) {
    for (const id of (changes.timeEntries.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM time_entries WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const t of cap(changes.timeEntries.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO time_entries (id,user_id,day,project,task,minutes,billable) VALUES (?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               day=excluded.day, project=excluded.project, task=excluded.task, minutes=excluded.minutes, billable=excluded.billable`,
          )
          .bind(str(t.id, 100), userId, str(t.date, 10), str(t.project, 200), str(t.task, 300), int(t.minutes), bool(t.billable)),
      );
    }
  }

  if (changes.invoices) {
    for (const id of (changes.invoices.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM invoices WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
      stmts.push(db.prepare("DELETE FROM invoice_items WHERE invoice_id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const inv of cap(changes.invoices.upsert)) {
      const id = str(inv.id, 100);
      stmts.push(
        db
          .prepare(
            `INSERT INTO invoices (id,user_id,number,client,issue_date,due_date,status,notes,currency) VALUES (?,?,?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               number=excluded.number, client=excluded.client, issue_date=excluded.issue_date, due_date=excluded.due_date,
               status=excluded.status, notes=excluded.notes, currency=excluded.currency`,
          )
          .bind(
            id,
            userId,
            str(inv.number, 60),
            str(inv.client, 200),
            str(inv.issueDate, 10),
            str(inv.dueDate, 10),
            oneOf(INVOICE_STATUSES, inv.status, "draft"),
            str(inv.notes, 4000),
            str(inv.currency, 8),
          ),
      );
      stmts.push(db.prepare("DELETE FROM invoice_items WHERE invoice_id = ? AND user_id = ?").bind(id, userId));
      (inv.items ?? []).slice(0, 100).forEach((it, index) => {
        stmts.push(
          db
            .prepare("INSERT INTO invoice_items (id,invoice_id,user_id,description,quantity,rate,sort_order) VALUES (?,?,?,?,?,?,?)")
            .bind(str(it.id, 100), id, userId, str(it.description, 500), num(it.quantity), num(it.rate), index),
        );
      });
    }
  }

  if (changes.withdrawalMethods) {
    for (const id of (changes.withdrawalMethods.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM withdrawal_methods WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const m of cap(changes.withdrawalMethods.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO withdrawal_methods (id,user_id,kind,label,holder,last4,currency,is_default,added_at) VALUES (?,?,?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               kind=excluded.kind, label=excluded.label, holder=excluded.holder, last4=excluded.last4,
               currency=excluded.currency, is_default=excluded.is_default`,
          )
          .bind(
            str(m.id, 100),
            userId,
            oneOf(WITHDRAWAL_KINDS, m.kind, "bank"),
            str(m.label, 200),
            str(m.holder, 200),
            str(m.last4, 4),
            str(m.currency, 8),
            bool(m.isDefault),
            str(m.addedAt, 40),
          ),
      );
    }
  }

  if (changes.benefits) {
    for (const id of (changes.benefits.delete ?? []).slice(0, MAX_ROWS)) {
      stmts.push(db.prepare("DELETE FROM benefits WHERE id = ? AND user_id = ?").bind(str(id, 100), userId));
    }
    for (const b of cap(changes.benefits.upsert)) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO benefits (id,user_id,name,provider,category,description,budget,used,enrolled,renews_on) VALUES (?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(user_id,id) DO UPDATE SET
               name=excluded.name, provider=excluded.provider, category=excluded.category, description=excluded.description,
               budget=excluded.budget, used=excluded.used, enrolled=excluded.enrolled, renews_on=excluded.renews_on`,
          )
          .bind(
            str(b.id, 100),
            userId,
            str(b.name, 200),
            str(b.provider, 200),
            oneOf(BENEFIT_CATEGORIES, b.category, "Health"),
            str(b.description, 2000),
            num(b.budget),
            num(b.used),
            bool(b.enrolled),
            str(b.renewsOn, 10),
          ),
      );
    }
  }

  if (changes.profile) {
    const p = changes.profile;
    stmts.push(
      db
        .prepare(
          `INSERT INTO profiles (user_id,name,email,initials,phone,job_title,department,manager,location,start_date,birthday,address,emergency_contact,bio)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(user_id) DO UPDATE SET
             name=excluded.name, email=excluded.email, initials=excluded.initials, phone=excluded.phone,
             job_title=excluded.job_title, department=excluded.department, manager=excluded.manager,
             location=excluded.location, start_date=excluded.start_date, birthday=excluded.birthday,
             address=excluded.address, emergency_contact=excluded.emergency_contact, bio=excluded.bio`,
        )
        .bind(
          userId,
          str(p.name, 200),
          str(p.email, 200),
          str(p.initials, 5),
          str(p.phone, 50),
          str(p.jobTitle, 200),
          str(p.department, 200),
          str(p.manager, 200),
          str(p.location, 200),
          str(p.startDate, 10),
          str(p.birthday, 10),
          str(p.address, 500),
          str(p.emergencyContact, 300),
          str(p.bio, 1000),
        ),
    );
  }

  if (changes.settings) {
    const s = changes.settings;
    stmts.push(
      db
        .prepare(
          `INSERT INTO user_settings (user_id,language,week_starts_on,time_format,day_start_hour,contract_days,carryover_days,show_weekends,email_notifications,push_notifications,weekly_digest,active_workspace_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(user_id) DO UPDATE SET
             language=excluded.language, week_starts_on=excluded.week_starts_on, time_format=excluded.time_format,
             day_start_hour=excluded.day_start_hour, contract_days=excluded.contract_days, carryover_days=excluded.carryover_days,
             show_weekends=excluded.show_weekends, email_notifications=excluded.email_notifications,
             push_notifications=excluded.push_notifications, weekly_digest=excluded.weekly_digest`,
        )
        .bind(
          userId,
          s.language === "en" ? "en" : "zh",
          int(s.weekStartsOn) === 1 ? 1 : 0,
          s.timeFormat === "12h" ? "12h" : "24h",
          Math.max(0, Math.min(23, int(s.dayStartHour))),
          Math.max(0, Math.min(365, num(s.contractDays))),
          Math.max(0, Math.min(365, num(s.carryoverDays))),
          bool(s.showWeekends),
          bool(s.emailNotifications),
          bool(s.pushNotifications),
          bool(s.weeklyDigest),
          changes.activeWorkspaceId ? str(changes.activeWorkspaceId, 100) : "",
        ),
    );
  } else if (changes.activeWorkspaceId) {
    stmts.push(
      db.prepare("UPDATE user_settings SET active_workspace_id = ? WHERE user_id = ?").bind(str(changes.activeWorkspaceId, 100), userId),
    );
  }

  if (changes.timer) {
    const t = changes.timer;
    stmts.push(
      db
        .prepare(
          `INSERT INTO timers (user_id,running,started_at,project,task) VALUES (?,?,?,?,?)
           ON CONFLICT(user_id) DO UPDATE SET running=excluded.running, started_at=excluded.started_at, project=excluded.project, task=excluded.task`,
        )
        .bind(userId, bool(t.running), t.startedAt === null ? null : int(t.startedAt), str(t.project, 200), str(t.task, 300)),
    );
  }

  if (stmts.length) await db.batch(stmts);
}

/* -------------------------------------------------------------------- admin */

export type AdminUser = {
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
};

export type AdminRequest = LeaveRequest & { userId: string; userName: string; userEmail: string };

export async function adminOverview(db: D1Database, viewer: SessionUser, year: string) {
  const users = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.manager_id,
              COALESCE(s.contract_days, 12) AS contract_days, COALESCE(s.carryover_days, 4) AS carryover_days
         FROM users u LEFT JOIN user_settings s ON s.user_id = u.id
        ORDER BY u.created_at`,
    )
    .all<{
      id: string;
      email: string;
      name: string;
      role: string;
      manager_id: string | null;
      contract_days: number;
      carryover_days: number;
    }>();

  const visible =
    viewer.role === "admin"
      ? (users.results ?? [])
      : (users.results ?? []).filter((u) => u.manager_id === viewer.id || u.id === viewer.id);

  const ids = visible.map((u) => u.id);
  const requests: AdminRequest[] = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db
      .prepare(
        `SELECT r.*, u.name AS user_name, u.email AS user_email
           FROM leave_requests r JOIN users u ON u.id = r.user_id
          WHERE r.user_id IN (${placeholders}) AND substr(r.date_from,1,4) = ?
          ORDER BY r.submitted_at DESC`,
      )
      .bind(...ids, year)
      .all<RequestRow & { user_name: string; user_email: string; user_id: string }>();
    for (const r of rows.results ?? []) {
      requests.push({
        id: r.id,
        status: (LEAVE_STATUSES.has(r.status) ? r.status : "pending") as LeaveStatus,
        type: (LEAVE_TYPES.has(r.type) ? r.type : "Time off") as LeaveType,
        duration: r.duration,
        days: r.days,
        from: r.date_from,
        to: r.date_to,
        allDay: !!r.all_day,
        start: r.start_min ?? undefined,
        end: r.end_min ?? undefined,
        notes: r.notes,
        submittedAt: r.submitted_at,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
      });
    }
  }

  const summary: AdminUser[] = visible.map((u) => {
    const mine = requests.filter((r) => r.userId === u.id);
    const used = mine.filter((r) => r.status === "approved").reduce((a, r) => a + r.days, 0);
    const pending = mine.filter((r) => r.status === "pending");
    const pendingDays = pending.reduce((a, r) => a + r.days, 0);
    const total = u.contract_days + u.carryover_days;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      managerId: u.manager_id,
      contractDays: u.contract_days,
      carryoverDays: u.carryover_days,
      used,
      pendingDays,
      pendingCount: pending.length,
      available: Math.max(0, total - used - pendingDays),
    };
  });

  return { users: summary, requests };
}

export async function setRequestStatusAsManager(
  db: D1Database,
  viewer: SessionUser,
  requestId: string,
  status: LeaveStatus,
): Promise<{ ok: boolean; error?: string }> {
  const row = await db
    .prepare("SELECT r.id, r.user_id, r.type, r.date_from, r.date_to, u.manager_id FROM leave_requests r JOIN users u ON u.id = r.user_id WHERE r.id = ?")
    .bind(requestId)
    .first<{ id: string; user_id: string; type: string; date_from: string; date_to: string; manager_id: string | null }>();
  if (!row) return { ok: false, error: "not_found" };
  const allowed = viewer.role === "admin" || (viewer.role === "manager" && row.manager_id === viewer.id);
  if (!allowed) return { ok: false, error: "forbidden" };

  const langRow = await db
    .prepare("SELECT language FROM user_settings WHERE user_id = ?")
    .bind(row.user_id)
    .first<{ language: string }>();
  const lang = langRow?.language === "en" ? "en" : "zh";
  const statusLabel = translate(
    status === "approved" ? "Approved" : status === "declined" ? "Declined" : status === "cancelled" ? "Cancelled" : "Pending",
    undefined,
    lang,
  );
  const when = `${row.date_from} – ${row.date_to}`;
  const title = translate("{type} {status}", { type: translate(row.type, undefined, lang), status: statusLabel }, lang);
  const bodyText = translate("Your request for {when} was {status}.", { when, status: statusLabel }, lang);

  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE leave_requests SET status = ? WHERE id = ? AND user_id = ?").bind(status, row.id, row.user_id),
    status === "declined" || status === "cancelled"
      ? db.prepare("DELETE FROM events WHERE request_id = ? AND user_id = ?").bind(row.id, row.user_id)
      : db
          .prepare("UPDATE events SET note = ? WHERE request_id = ? AND user_id = ?")
          .bind(status === "approved" ? "Approved" : "Pending", row.id, row.user_id),
    db
      .prepare("INSERT INTO notifications (id,user_id,title,body,created_at,read,href) VALUES (?,?,?,?,?,?,?)")
      .bind(`no-${crypto.randomUUID().slice(0, 8)}`, row.user_id, title, bodyText, now, 0, "/time-off"),
  ]);
  return { ok: true };
}
